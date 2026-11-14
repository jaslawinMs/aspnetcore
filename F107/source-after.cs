// Licensed to the .NET Foundation under one or more agreements.
// The .NET Foundation licenses this file to you under the MIT license.

namespace Microsoft.AspNetCore.Http;

/// <summary>
/// Default implementation of <see cref="IFormFileCollection"/>.
/// </summary>
public class FormFileCollection : List<IFormFile>, IFormFileCollection
{
    /// <inheritdoc />
    public IFormFile? this[string name] => GetFile(name);

    /// <inheritdoc />
    public IFormFile? GetFile(string name)
    {
        foreach (var file in this)
        {
            if (string.Equals(name, file.Name, StringComparison.OrdinalIgnoreCase))
            {
                return file;
            }
        }

        return null;
    }

    /// <inheritdoc />
    public IReadOnlyList<IFormFile> GetFiles(string name)
    {
        List<IFormFile>? files = null;

        foreach (var file in this)
        {
            if (string.Equals(name, file.Name, StringComparison.OrdinalIgnoreCase))
            {
                files ??= new List<IFormFile>();
                files.Add(file);
            }
        }

        return files is not null ? files : Array.Empty<IFormFile>();
    }
}
