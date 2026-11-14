// Licensed to the .NET Foundation under one or more agreements.
// The .NET Foundation licenses this file to you under the MIT license.

using System.Reflection;
using System.Reflection.Emit;
using Microsoft.AspNetCore.Mvc.ApplicationParts;
using Microsoft.AspNetCore.Mvc.ViewComponents;
using Microsoft.AspNetCore.Mvc.ViewFeatures.ViewComponents.ViewComponentsFeatureTest;
using Moq;

namespace Microsoft.AspNetCore.Mvc.ViewFeatures.ViewComponents
{
    public class ViewComponentFeatureProviderTest
    {
        [Fact]
        public void GetDescriptor_DefaultConventions()
        {
            // Arrange
            var manager = new ApplicationPartManager();
            manager.ApplicationParts.Add(new TestPart(typeof(ConventionsViewComponent)));
            manager.FeatureProviders.Add(new ViewComponentFeatureProvider());

            var feature = new ViewComponentFeature();

            // Act
            manager.PopulateFeature(feature);

            // Assert
            Assert.Equal(new[] { typeof(ConventionsViewComponent).GetTypeInfo() }, feature.ViewComponents.ToArray());
        }

        [Fact]
        public void GetDescriptor_WithAttribute()
        {
            // Arrange
            var manager = new ApplicationPartManager();
            manager.ApplicationParts.Add(new TestPart(typeof(AttributeViewComponent)));
            manager.FeatureProviders.Add(new ViewComponentFeatureProvider());

            var feature = new ViewComponentFeature();

            // Act
            manager.PopulateFeature(feature);

            // Assert
            Assert.Equal(new[] { typeof(AttributeViewComponent).GetTypeInfo() }, feature.ViewComponents.ToArray());
        }

        [Theory]
        [InlineData(31)]
        [InlineData(32)]
        [InlineData(33)]
        [InlineData(255)]
        [InlineData(256)]
        [InlineData(257)]
        public void PopulateFeature_PreservesAssemblyOrderAndExistingDuplicates(int existingCount)
        {
            var assembly = CreateComponentAssembly(64);
            var types = assembly.DefinedTypes.ToArray();
            var manager = new ApplicationPartManager();
            manager.ApplicationParts.Add(new NoTypesPart());
            manager.ApplicationParts.Add(null);
            manager.ApplicationParts.Add(new AssemblyPart(assembly));
            manager.ApplicationParts.Add(new AssemblyPart(assembly));
            manager.FeatureProviders.Add(new ViewComponentFeatureProvider());
            var feature = new ViewComponentFeature();
            var originalList = feature.ViewComponents;
            var existing = Enumerable.Repeat(types[0], existingCount).ToArray();
            foreach (var type in existing)
            {
                feature.ViewComponents.Add(type);
            }

            manager.PopulateFeature(feature);

            Assert.Same(originalList, feature.ViewComponents);
            Assert.Equal(existing.Concat(types.Skip(1)), feature.ViewComponents);
        }

        [Theory]
        [InlineData("add")]
        [InlineData("remove")]
        [InlineData("replace")]
        public void PopulateFeature_PreservesCustomPartListMutations(string mutation)
        {
            var convention = typeof(ConventionsViewComponent).GetTypeInfo();
            var attributed = typeof(AttributeViewComponent).GetTypeInfo();
            var feature = new ViewComponentFeature();
            if (mutation is not "add")
            {
                feature.ViewComponents.Add(attributed);
            }
            for (var i = feature.ViewComponents.Count; i < 300; i++)
            {
                feature.ViewComponents.Add(convention);
            }
            var manager = new ApplicationPartManager();
            manager.ApplicationParts.Add(new EnumerablePart(GetTypes()));
            manager.FeatureProviders.Add(new ViewComponentFeatureProvider());

            manager.PopulateFeature(feature);

            var conventionCount = mutation is "remove" ? 299 : 300;
            Assert.Equal(Enumerable.Repeat(convention, conventionCount).Append(attributed), feature.ViewComponents);

            IEnumerable<TypeInfo> GetTypes()
            {
                yield return convention;
                if (mutation is "add")
                {
                    feature.ViewComponents.Add(attributed);
                }
                else if (mutation is "remove")
                {
                    feature.ViewComponents.RemoveAt(0);
                }
                else
                {
                    feature.ViewComponents[0] = convention;
                }
                yield return attributed;
            }
        }

        [Fact]
        public void PopulateFeature_PreservesReimplementedAssemblyPartTypes()
        {
            var feature = CreatePrepopulatedFeature();
            var manager = new ApplicationPartManager();
            manager.ApplicationParts.Add(new ReimplementedAssemblyPart(ReplaceDuringEnumeration(feature)));
            manager.FeatureProviders.Add(new ViewComponentFeatureProvider());

            manager.PopulateFeature(feature);

            Assert.Equal(
                new[] { typeof(AttributeViewComponent).GetTypeInfo() }.Concat(
                    Enumerable.Repeat(typeof(ConventionsViewComponent).GetTypeInfo(), 255)),
                feature.ViewComponents);
        }

        [Fact]
        public void PopulateFeature_PreservesCustomAssemblyTypeEnumeration()
        {
            var feature = CreatePrepopulatedFeature();
            var assembly = new Mock<Assembly>(MockBehavior.Strict);
            assembly.SetupGet(value => value.DefinedTypes).Returns(ReplaceDuringEnumeration(feature));
            var manager = new ApplicationPartManager();
            manager.ApplicationParts.Add(new AssemblyPart(assembly.Object));
            manager.FeatureProviders.Add(new ViewComponentFeatureProvider());

            manager.PopulateFeature(feature);

            Assert.Equal(
                new[] { typeof(AttributeViewComponent).GetTypeInfo() }.Concat(
                    Enumerable.Repeat(typeof(ConventionsViewComponent).GetTypeInfo(), 255)),
                feature.ViewComponents);
            assembly.VerifyGet(value => value.DefinedTypes, Times.Once);
        }

        [Fact]
        public void PopulateFeature_PreservesSinglePassPartsEnumeration()
        {
            var feature = CreatePrepopulatedFeature();
            var enumerations = 0;

            new ViewComponentFeatureProvider().PopulateFeature(GetParts(), feature);

            Assert.Equal(1, enumerations);
            Assert.Equal(
                new[] { typeof(AttributeViewComponent).GetTypeInfo() }.Concat(
                    Enumerable.Repeat(typeof(ConventionsViewComponent).GetTypeInfo(), 255)),
                feature.ViewComponents);

            IEnumerable<ApplicationPart> GetParts()
            {
                enumerations++;
                feature.ViewComponents[0] = typeof(AttributeViewComponent).GetTypeInfo();
                yield return new TestPart(typeof(AttributeViewComponent));
            }
        }

        [Theory]
        [InlineData(true)]
        [InlineData(false)]
        public void PopulateFeature_PreservesNullArgumentErrors(bool nullParts)
        {
            var provider = new ViewComponentFeatureProvider();

            var exception = Assert.Throws<ArgumentNullException>(() =>
                provider.PopulateFeature(nullParts ? null : Array.Empty<ApplicationPart>(),
                    nullParts ? new ViewComponentFeature() : null));

            Assert.Equal(nullParts ? "parts" : "feature", exception.ParamName);
        }

        private static Assembly CreateComponentAssembly(int count)
        {
            var builder = new PersistedAssemblyBuilder(
                new AssemblyName($"ViewComponentFeatureProviderTest_{Guid.NewGuid():N}"), typeof(object).Assembly);
            var module = builder.DefineDynamicModule("Components");
            for (var i = 0; i < count; i++)
            {
                var type = module.DefineType($"Generated.Component{i:D3}ViewComponent", TypeAttributes.Public);
                var invoke = type.DefineMethod(
                    nameof(ConventionsViewComponent.Invoke), MethodAttributes.Public, typeof(string), Type.EmptyTypes);
                var il = invoke.GetILGenerator();
                il.Emit(OpCodes.Ldstr, string.Empty);
                il.Emit(OpCodes.Ret);
                type.CreateTypeInfo();
            }
            using var stream = new MemoryStream();
            builder.Save(stream);
            return Assembly.Load(stream.ToArray());
        }

        private static ViewComponentFeature CreatePrepopulatedFeature()
        {
            var feature = new ViewComponentFeature();
            for (var i = 0; i < 256; i++)
            {
                feature.ViewComponents.Add(typeof(ConventionsViewComponent).GetTypeInfo());
            }
            return feature;
        }

        private static IEnumerable<TypeInfo> ReplaceDuringEnumeration(ViewComponentFeature feature)
        {
            yield return typeof(ConventionsViewComponent).GetTypeInfo();
            feature.ViewComponents[0] = typeof(AttributeViewComponent).GetTypeInfo();
            yield return typeof(AttributeViewComponent).GetTypeInfo();
        }

        private class EnumerablePart(IEnumerable<TypeInfo> types) : ApplicationPart, IApplicationPartTypeProvider
        {
            public override string Name => "Enumerable";
            public IEnumerable<TypeInfo> Types { get; } = types;
        }

        private class ReimplementedAssemblyPart(IEnumerable<TypeInfo> types)
            : AssemblyPart(typeof(ConventionsViewComponent).Assembly), IApplicationPartTypeProvider
        {
            IEnumerable<TypeInfo> IApplicationPartTypeProvider.Types => types;
        }

        private class NoTypesPart : ApplicationPart
        {
            public override string Name => "No types";
        }

        private class TestPart : ApplicationPart, IApplicationPartTypeProvider
        {
            public TestPart(params Type[] types)
            {
                Types = types.Select(t => t.GetTypeInfo());
            }

            public override string Name => "Test";

            public IEnumerable<TypeInfo> Types { get; }
        }
    }
}

// These tests need to be public for the test to be valid
namespace Microsoft.AspNetCore.Mvc.ViewFeatures.ViewComponents.ViewComponentsFeatureTest
{
    public class ConventionsViewComponent
    {
        public string Invoke() => "Hello world";
    }

    [ViewComponent(Name = "AttributesAreGreat")]
    public class AttributeViewComponent
    {
        public Task<string> InvokeAsync() => Task.FromResult("Hello world");
    }
}
