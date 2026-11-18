// Licensed to the .NET Foundation under one or more agreements.
// The .NET Foundation licenses this file to you under the MIT license.

using System.Text.Json;
using Microsoft.AspNetCore.JsonPatch.SystemTextJson;

namespace AutoPerf;

internal sealed class ReplaceScenario
{
    private readonly JsonPatchDocument _patch;
    private readonly object _target;
    private readonly Action<JsonPatchError> _reportError;
    private readonly string _profile;
    private readonly int _count;
    private int _errors;
    private string? _lastError;

    internal ReplaceScenario(int count, string profile)
    {
        Evidence.Require(count is 1 or 64, "Use only the two predeclared sizes.");
        _count = count;
        _profile = profile;
        var isInt = profile is "ProgrammaticIntExisting" or "ParsedIntExisting";
        Evidence.Require(isInt || profile is "ParsedObjectExisting" or "ParsedObjectMissing"
            or "ProgrammaticNullExisting" or "ParsedObjectTestControl", "Require a predeclared profile.");
        _patch = profile switch
        {
            "ProgrammaticIntExisting" => new JsonPatchDocument().Replace("/Value", 42),
            "ProgrammaticNullExisting" => new JsonPatchDocument().Replace("/Value", null),
            "ParsedObjectTestControl" => Parse("""[{"op":"test","path":"/Value","value":42}]"""),
            _ => Parse("""[{"op":"replace","path":"/Value","value":42}]""")
        };
        var missing = profile == "ParsedObjectMissing";
        if (isInt)
        {
            var dictionary = new Dictionary<string, int>(StringComparer.Ordinal) { ["Value"] = 1 };
            for (var index = 1; index < count; index++)
            {
                dictionary.Add($"Item{index}", index);
            }
            _target = dictionary;
        }
        else
        {
            var dictionary = new Dictionary<string, object?>(StringComparer.Ordinal);
            if (!missing)
            {
                dictionary.Add("Value", profile == "ParsedObjectTestControl" ? JsonSerializer.SerializeToElement(42) : 1);
            }
            for (var index = missing ? 0 : 1; index < count; index++)
            {
                dictionary.Add($"Item{index}", index);
            }
            _target = dictionary;
        }
        _reportError = error =>
        {
            _errors++;
            _lastError = error.ErrorMessage;
        };
    }

    internal string? InputRepresentation => _patch.Operations[0].value?.GetType().FullName;

    internal static JsonPatchDocument Parse(string json, JsonSerializerOptions? options = null)
    {
        return JsonSerializer.Deserialize<JsonPatchDocument>(json, options) ?? throw new InvalidOperationException("The real patch converter returned null.");
    }

    internal int ApplyAndObserve()
    {
        _errors = 0;
        _patch.ApplyTo(_target, _reportError);
        if (_target is Dictionary<string, int> integers)
        {
            return integers["Value"] + _errors;
        }
        var objects = (Dictionary<string, object?>)_target;
        if (_profile == "ParsedObjectMissing")
        {
            return objects.Count + _errors;
        }

        return objects["Value"] switch
        {
            JsonElement element => element.GetInt32() + _errors,
            int integer => integer + _errors,
            null => _errors,
            _ => throw new InvalidOperationException("Unexpected material replacement result.")
        };
    }

    internal void Verify()
    {
        var observed = ApplyAndObserve();
        Evidence.Require(observed == (_profile switch
        {
            "ProgrammaticNullExisting" => 0,
            "ParsedObjectMissing" => _count + 1,
            _ => 42
        }), "Require the actual consumed result for this profile.");
        var count = _target is Dictionary<string, int> integers ? integers.Count : ((Dictionary<string, object?>)_target).Count;
        Evidence.Require(count == _count, "Replacement/error/test must preserve the fixture's entry count.");
        if (_profile == "ParsedObjectMissing")
        {
            Evidence.Require(_errors == 1 && _lastError == "The target location specified by path segment 'Value' was not found."
                && !((Dictionary<string, object?>)_target).ContainsKey("Value"), "A missing replacement must not add an entry.");
        }
        else
        {
            Evidence.Require(_errors == 0, "A successful fixture must not silently report an error.");
        }
    }
}
