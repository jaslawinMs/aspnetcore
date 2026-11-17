// Licensed to the .NET Foundation under one or more agreements.
// The .NET Foundation licenses this file to you under the MIT license.

using System.Collections.Concurrent;
using System.Linq.Expressions;
using System.Reflection;
using System.Reflection.Emit;
using System.Reflection.Metadata;
using System.Runtime.CompilerServices;
using Microsoft.AspNetCore.Mvc.ModelBinding;
using Moq;

namespace Microsoft.AspNetCore.Mvc.ViewFeatures;

public class ExpressionHelperTest
{
    private readonly ConcurrentDictionary<LambdaExpression, string> _expressionTextCache = new ConcurrentDictionary<LambdaExpression, string>(LambdaExpressionComparer.Instance);

    public static TheoryData<LambdaExpression, string> ExpressionAndTexts
    {
        get
        {
            var i = 3;
            var value = "Test";
            var key = "TestModel";
            var myModels = new List<TestModel>();
            var models = new List<TestModel>();
            var modelTest = new TestModel();
            var modelType = typeof(TestModel);

            var data = new TheoryData<LambdaExpression, string>
                {
                    {
                        (Expression<Func<TestModel, Category>>)(model => model.SelectedCategory),
                        "SelectedCategory"
                    },
                    {
                        (Expression<Func<TestModel, CategoryName>>)(model => model.SelectedCategory.CategoryName),
                        "SelectedCategory.CategoryName"
                    },
                    {
                        (Expression<Func<TestModel, int>>)(testModel => testModel.SelectedCategory.CategoryId),
                        "SelectedCategory.CategoryId"
                    },
                    {
                        (Expression<Func<LowerModel, int>>)(testModel => testModel.selectedcategory.CategoryId),
                        "selectedcategory.CategoryId"
                    },
                    {
                        (Expression<Func<TestModel, string>>)(model => model.SelectedCategory.CategoryName.MainCategory),
                        "SelectedCategory.CategoryName.MainCategory"
                    },
                    {
                        (Expression<Func<TestModel, TestModel>>)(model => model),
                        string.Empty
                    },
                    {
                        (Expression<Func<TestModel, string>>)(model => value),
                        "value"
                    },
                    {
                        (Expression<Func<TestModel, int>>)(model => models[0].SelectedCategory.CategoryId),
                        "models[0].SelectedCategory.CategoryId"
                    },
                    {
                        (Expression<Func<TestModel, string>>)(model => modelTest.Name),
                        "modelTest.Name"
                    },
                    {
                        (Expression<Func<TestModel, Type>>)(model => modelType),
                        "modelType"
                    },
                    {
                        (Expression<Func<IList<TestModel>, Category>>)(model => model[2].SelectedCategory),
                        "[2].SelectedCategory"
                    },
                    {
                        (Expression<Func<IList<TestModel>, Category>>)(model => model[i].SelectedCategory),
                        "[3].SelectedCategory"
                    },
                    {
                        (Expression<Func<IList<LowerModel>, Category>>)(model => model[i].selectedcategory),
                        "[3].selectedcategory"
                    },
                    {
                        (Expression<Func<IDictionary<string, TestModel>, string>>)(model => model[key].SelectedCategory.CategoryName.MainCategory),
                        "[TestModel].SelectedCategory.CategoryName.MainCategory"
                    },
                    {
                        (Expression<Func<TestModel, int>>)(model => model.PreferredCategories[i].CategoryId),
                        "PreferredCategories[3].CategoryId"
                    },
                    {
                        (Expression<Func<IList<TestModel>, Category>>)(model => myModels[i].SelectedCategory),
                        "myModels[3].SelectedCategory"
                    },
                    {
                        (Expression<Func<IList<TestModel>, int>>)(model => model[2].PreferredCategories[i].CategoryId),
                        "[2].PreferredCategories[3].CategoryId"
                    },
                    {
                        (Expression<Func<IList<LowerModel>, int>>)(model => model[2].preferredcategories[i].CategoryId),
                        "[2].preferredcategories[3].CategoryId"
                    },
                    {
                        (Expression<Func<IList<TestModel>, string>>)(model => model.FirstOrDefault().Name),
                        "Name"
                    },
                    {
                        (Expression<Func<IList<LowerModel>, string>>)(model => model.FirstOrDefault().name),
                        "name"
                    },
                    {
                        (Expression<Func<IList<TestModel>, string>>)(model => model.FirstOrDefault().Model),
                        "Model"
                    },
                    {
                        (Expression<Func<IList<TestModel>, int>>)(model => model.FirstOrDefault().SelectedCategory.CategoryId),
                        "SelectedCategory.CategoryId"
                    },
                    {
                        (Expression<Func<IList<TestModel>, string>>)(model => model.FirstOrDefault().SelectedCategory.CategoryName.MainCategory),
                        "SelectedCategory.CategoryName.MainCategory"
                    },
                    {
                        (Expression<Func<IList<TestModel>, int>>)(model => model.FirstOrDefault().PreferredCategories.Count),
                        "PreferredCategories.Count"
                    },
                    {
                        (Expression<Func<IList<TestModel>, int>>)(model => model.FirstOrDefault().PreferredCategories.FirstOrDefault().CategoryId),
                        "CategoryId"
                    },
                    // Constants are not supported.
                    {
                        // Namespace never appears in expression name. "Model" there doesn't matter.
                        (Expression<Func<TestModel, int>>)(m => Microsoft.AspNetCore.Mvc.ViewFeatures.Model.Constants.WoodstockYear),
                        string.Empty
                    },
                    {
                        // Class name never appears in expression name. "Model" there doesn't matter.
                        (Expression<Func<TestModel, int>>)(m => Model.Constants.WoodstockYear),
                        string.Empty
                    },
                    // ExpressionHelper treats static properties like other member accesses. Similarly to
                    // RazorPage.Model, name "Model" is ignored at LHS of these expressions. This is a rare case because
                    // static properties are the only leftmost member accesses that can reach beyond the current class.
                    {
                        (Expression<Func<TestModel, string>>)(m => Model.Constants.Model.Name),
                        "Name"
                    },
                    {
                        (Expression<Func<TestModel, string>>)(m => AStaticClass.Model),
                        string.Empty
                    },
                    {
                        (Expression<Func<TestModel, string>>)(m => AStaticClass.Test),
                        "Test"
                    },
                    {
                        (Expression<Func<TestModel, string>>)(m => AnotherStaticClass.Model.Name),
                        "Name"
                    },
                    {
                        (Expression<Func<TestModel, string>>)(m => AnotherStaticClass.Test.Name),
                        "Test.Name"
                    },
                };

            {
                // Nearly impossible in a .cshtml file because model is a keyword.
                var model = "Some string";
                data.Add((Expression<Func<TestModel, string>>)(m => model), string.Empty);
            }

            {
                // Model property in RazorPage is "special" (in a good way).
                var Model = new TestModel();
                data.Add((Expression<Func<TestModel, TestModel>>)(m => Model), string.Empty);
                data.Add((Expression<Func<TestModel, TestModel>>)(model => Model), string.Empty);
                data.Add((Expression<Func<TestModel, Category>>)(m => Model.SelectedCategory), "SelectedCategory");
            }

            return data;
        }
    }

    public static TheoryData<LambdaExpression> CachedExpressions
    {
        get
        {
            var key = "TestModel";
            var myModel = new TestModel();

            return new TheoryData<LambdaExpression>
                {
                    (Expression<Func<TestModel, Category>>)(model => model.SelectedCategory),
                    (Expression<Func<TestModel, CategoryName>>)(model => model.SelectedCategory.CategoryName),
                    (Expression<Func<TestModel, int>>)(testModel => testModel.SelectedCategory.CategoryId),
                    (Expression<Func<TestModel, string>>)(model => model.SelectedCategory.CategoryName.MainCategory),
                    (Expression<Func<TestModel, string>>)(testModel => key),
                    (Expression<Func<TestModel, TestModel>>)(m => m),
                    (Expression<Func<TestModel, Category>>)(m => myModel.SelectedCategory),
                };
        }
    }

    public static TheoryData<LambdaExpression> IndexerExpressions
    {
        get
        {
            var i = 3;
            var key = "TestModel";
            var myModels = new List<TestModel>();

            return new TheoryData<LambdaExpression>
                {
                    (Expression<Func<IList<TestModel>, Category>>)(model => model[2].SelectedCategory),
                    (Expression<Func<IList<TestModel>, Category>>)(model => myModels[i].SelectedCategory),
                    (Expression<Func<IList<TestModel>, CategoryName>>)(testModel => testModel[i].SelectedCategory.CategoryName),
                    (Expression<Func<TestModel, int>>)(model => model.PreferredCategories[i].CategoryId),
                    (Expression<Func<IDictionary<string, TestModel>, string>>)(model => model[key].SelectedCategory.CategoryName.MainCategory),
                };
        }
    }

    public static TheoryData<LambdaExpression> UnsupportedExpressions
    {
        get
        {
            var i = 2;
            var j = 3;

            return new TheoryData<LambdaExpression>
                {
                    // Indexers that have multiple arguments.
                    (Expression<Func<TestModel[][], string>>)(model => model[23][3].Name),
                    (Expression<Func<TestModel[][], string>>)(model => model[i][3].Name),
                    (Expression<Func<TestModel[][], string>>)(model => model[23][j].Name),
                    (Expression<Func<TestModel[][], string>>)(model => model[i][j].Name),
                    // Calls that aren't indexers.
                    (Expression<Func<IList<TestModel>, string>>)(model => model.FirstOrDefault().Name),
                    (Expression<Func<IList<TestModel>, string>>)(model => model.FirstOrDefault().SelectedCategory.CategoryName.MainCategory),
                    (Expression<Func<IList<TestModel>, int>>)(model => model.FirstOrDefault().PreferredCategories.FirstOrDefault().CategoryId),
                };
        }
    }

    public static TheoryData<LambdaExpression, LambdaExpression> EquivalentExpressions
    {
        get
        {
            var value = "Test";
            var Model = "Test";

            return new TheoryData<LambdaExpression, LambdaExpression>
                {
                    {
                        (Expression<Func<TestModel, Category>>)(model => model.SelectedCategory),
                        (Expression<Func<TestModel, Category>>)(model => model.SelectedCategory)
                    },
                    {
                        (Expression<Func<TestModel, CategoryName>>)(model => model.SelectedCategory.CategoryName),
                        (Expression<Func<TestModel, CategoryName>>)(model => model.SelectedCategory.CategoryName)
                    },
                    {
                        (Expression<Func<TestModel, int>>)(testModel => testModel.SelectedCategory.CategoryId),
                        (Expression<Func<TestModel, int>>)(testModel => testModel.SelectedCategory.CategoryId)
                    },
                    {
                        (Expression<Func<TestModel, string>>)(model => model.SelectedCategory.CategoryName.MainCategory),
                        (Expression<Func<TestModel, string>>)(model => model.SelectedCategory.CategoryName.MainCategory)
                    },
                    {
                        (Expression<Func<TestModel, TestModel>>)(model => model),
                        (Expression<Func<TestModel, TestModel>>)(m => m)
                    },
                    {
                        (Expression<Func<TestModel, string>>)(model => value),
                        (Expression<Func<TestModel, string>>)(m => value)
                    },
                    {
                        // These two expressions are not actually equivalent. However ExpressionHelper returns
                        // string.Empty for these two expressions and hence they are considered as equivalent by the
                        // cache.
                        (Expression<Func<TestModel, string>>)(m => Model),
                        (Expression<Func<TestModel, TestModel>>)(m => m)
                    },
                };
        }
    }

    public static TheoryData<LambdaExpression, LambdaExpression> NonEquivalentExpressions
    {
        get
        {
            var value = "test";
            var key = "TestModel";
            var Model = "Test";
            var myModel = new TestModel();

            return new TheoryData<LambdaExpression, LambdaExpression>
                {
                    {
                        (Expression<Func<TestModel, Category>>)(model => model.SelectedCategory),
                        (Expression<Func<TestModel, CategoryName>>)(model => model.SelectedCategory.CategoryName)
                    },
                    {
                        (Expression<Func<TestModel, CategoryName>>)(model => model.SelectedCategory.CategoryName),
                        (Expression<Func<LowerModel, CategoryName>>)(model => model.selectedcategory.CategoryName)
                    },
                    {
                        (Expression<Func<TestModel, string>>)(model => model.Model),
                        (Expression<Func<TestModel, string>>)(model => model.Name)
                    },
                    {
                        (Expression<Func<TestModel, string>>)(model => model.Model),
                        (Expression<Func<LowerModel, string>>)(model => model.model)
                    },
                    {
                        (Expression<Func<TestModel, string>>)(model => model.Name),
                        (Expression<Func<LowerModel, string>>)(model => model.name)
                    },
                    {
                        (Expression<Func<TestModel, CategoryName>>)(model => model.SelectedCategory.CategoryName),
                        (Expression<Func<TestModel, string>>)(model => value)
                    },
                    {
                        (Expression<Func<TestModel, string>>)(testModel => testModel.SelectedCategory.CategoryName.MainCategory),
                        (Expression<Func<TestModel, string>>)(testModel => value)
                    },
                    {
                        (Expression<Func<IList<TestModel>, Category>>)(model => model[2].SelectedCategory),
                        (Expression<Func<TestModel, string>>)(model => model.SelectedCategory.CategoryName.MainCategory)
                    },
                    {
                        (Expression<Func<IList<TestModel>, Category>>)(model => model[2].SelectedCategory),
                        (Expression<Func<IList<LowerModel>, Category>>)(model => model[2].selectedcategory)
                    },
                    {
                        (Expression<Func<TestModel, int>>)(testModel => testModel.SelectedCategory.CategoryId),
                        (Expression<Func<TestModel, Category>>)(model => model.SelectedCategory)
                    },
                    {
                        (Expression<Func<IDictionary<string, TestModel>, string>>)(model => model[key].SelectedCategory.CategoryName.MainCategory),
                        (Expression<Func<TestModel, Category>>)(model => model.SelectedCategory)
                    },
                    {
                        (Expression<Func<IDictionary<string, TestModel>, string>>)(model => model[key].SelectedCategory.CategoryName.MainCategory),
                        (Expression<Func<IDictionary<string, LowerModel>, string>>)(model => model[key].selectedcategory.CategoryName.MainCategory)
                    },
                    {
                        (Expression<Func<TestModel, string>>)(m => Model),
                        (Expression<Func<TestModel, string>>)(m => m.Model)
                    },
                    {
                        (Expression<Func<TestModel, TestModel>>)(m => m),
                        (Expression<Func<TestModel, string>>)(m => m.Model)
                    },
                    {
                        (Expression<Func<TestModel, string>>)(m => myModel.Name),
                        (Expression<Func<TestModel, string>>)(m => m.Name)
                    },
                    {
                        (Expression<Func<TestModel, string>>)(m => key),
                        (Expression<Func<TestModel, string>>)(m => value)
                    },
                };
        }
    }

    [Theory]
    [MemberData(nameof(ExpressionAndTexts))]
    public void GetExpressionText_ReturnsExpectedExpressionText(LambdaExpression expression, string expressionText)
    {
        // Act
        var text = ExpressionHelper.GetExpressionText(expression, _expressionTextCache);

        // Assert
        Assert.Equal(expressionText, text);
    }

    [Theory]
    [MemberData(nameof(CachedExpressions))]
    public void GetExpressionText_CachesExpression(LambdaExpression expression)
    {
        // Act - 1
        var text1 = ExpressionHelper.GetExpressionText(expression, _expressionTextCache);

        // Act - 2
        var text2 = ExpressionHelper.GetExpressionText(expression, _expressionTextCache);

        // Assert
        Assert.Same(text1, text2); // cached
    }

    [Theory]
    [MemberData(nameof(IndexerExpressions))]
    [MemberData(nameof(UnsupportedExpressions))]
    public void GetExpressionText_DoesNotCacheIndexerOrUnsupportedExpression(LambdaExpression expression)
    {
        // Act - 1
        var text1 = ExpressionHelper.GetExpressionText(expression, _expressionTextCache);

        // Act - 2
        var text2 = ExpressionHelper.GetExpressionText(expression, _expressionTextCache);

        // Assert
        Assert.Equal(text1, text2, StringComparer.Ordinal);
        Assert.NotSame(text1, text2); // not cached
    }

    [Theory]
    [MemberData(nameof(EquivalentExpressions))]
    public void GetExpressionText_CacheEquivalentExpressions(LambdaExpression expression1, LambdaExpression expression2)
    {
        // Act - 1
        var text1 = ExpressionHelper.GetExpressionText(expression1, _expressionTextCache);

        // Act - 2
        var text2 = ExpressionHelper.GetExpressionText(expression2, _expressionTextCache);

        // Assert
        Assert.Same(text1, text2); // cached
    }

    [Theory]
    [MemberData(nameof(NonEquivalentExpressions))]
    public void GetExpressionText_CheckNonEquivalentExpressions(LambdaExpression expression1, LambdaExpression expression2)
    {
        // Act - 1
        var text1 = ExpressionHelper.GetExpressionText(expression1, _expressionTextCache);

        // Act - 2
        var text2 = ExpressionHelper.GetExpressionText(expression2, _expressionTextCache);

        // Assert
        Assert.NotEqual(text1, text2, StringComparer.Ordinal);
        Assert.NotSame(text1, text2);
    }

    [Fact]
    public void GetExpressionText_WithinALoop_ReturnsExpectedText()
    {
        // Arrange 0
        var collection = new List<TestModel>();

        for (var i = 0; i < 2; i++)
        {
            // Arrange i
            var expectedText = $"collection[{i}].SelectedCategory.CategoryId";

            // Act i
            var result = ExpressionHelper.GetExpressionText(
                (Expression<Func<List<TestModel>, int>>)(m => collection[i].SelectedCategory.CategoryId),
                _expressionTextCache);

            // Assert i
            Assert.Equal(expectedText, result);
        }
    }

    [Fact]
    public void IsSingleArgumentIndexer_RepeatedClassificationMatchesMetadataUpdateSupport()
    {
        Expression<Func<List<TestModel>, TestModel>> expression = model => model[0];
        var call = Assert.IsAssignableFrom<MethodCallExpression>(expression.Body);
        for (var index = 0; index < 64; index++)
        {
            Assert.True(ExpressionHelper.IsSingleArgumentIndexer(call));
        }

        var before = GC.GetAllocatedBytesForCurrentThread();
        for (var index = 0; index < 32; index++)
        {
            Assert.True(ExpressionHelper.IsSingleArgumentIndexer(call));
        }
        var allocated = GC.GetAllocatedBytesForCurrentThread() - before;

        if (MetadataUpdater.IsSupported)
        {
            Assert.True(allocated > 0);
        }
        else
        {
            Assert.Equal(0L, allocated);
        }
    }

    [Fact]
    public void GetExpressionText_RetainedExpressionUsesCurrentIndex()
    {
        var provider = new ModelExpressionProvider(new EmptyModelMetadataProvider());
        var index = 0;
        Expression<Func<List<TestModel>, string>> expression = model => model[index].Name;

        Assert.Equal("[0].Name", provider.GetExpressionText(expression));

        index = 2;

        Assert.Equal("[2].Name", provider.GetExpressionText(expression));
    }

    [Fact]
    public void IsSingleArgumentIndexer_DoesNotCacheMutableReflectionMetadata()
    {
        Expression<Func<List<TestModel>, TestModel>> expression = model => model[0];
        var originalCall = Assert.IsAssignableFrom<MethodCallExpression>(expression.Body);
        var originalMethod = originalCall.Method;
        var indexerName = originalMethod.DeclaringType.GetCustomAttribute<DefaultMemberAttribute>().MemberName;
        var defaultMemberName = indexerName;
        var declaringType = new Mock<TypeDelegator>(originalMethod.DeclaringType) { CallBase = true };
        var method = new Mock<MethodInfo>();
        var property = new Mock<PropertyInfo>();
        method.SetupGet(value => value.DeclaringType).Returns(declaringType.Object);
        method.SetupGet(value => value.Name).Returns(originalMethod.Name);
        method.SetupGet(value => value.ReturnType).Returns(originalMethod.ReturnType);
        method.SetupGet(value => value.Attributes).Returns(originalMethod.Attributes);
        method.SetupGet(value => value.CallingConvention).Returns(originalMethod.CallingConvention);
        method.Setup(value => value.GetParameters()).Returns(originalMethod.GetParameters);
        property.SetupGet(value => value.Name).Returns(indexerName);
        property.SetupGet(value => value.GetMethod).Returns(method.Object);
        declaringType.Setup(value => value.GetCustomAttributes(typeof(DefaultMemberAttribute), It.IsAny<bool>()))
            .Returns(() => new Attribute[] { new DefaultMemberAttribute(defaultMemberName) });
        declaringType.Setup(value => value.GetProperties(It.IsAny<BindingFlags>()))
            .Returns(new[] { property.Object });
        declaringType.Setup(value => value.IsAssignableFrom(It.IsAny<Type>()))
            .Returns((Type value) => originalMethod.DeclaringType.IsAssignableFrom(value));
        var call = Expression.Call(originalCall.Object, method.Object, originalCall.Arguments);

        Assert.True(ExpressionHelper.IsSingleArgumentIndexer(call));

        defaultMemberName = nameof(TestModel.Name);

        Assert.False(ExpressionHelper.IsSingleArgumentIndexer(call));

        defaultMemberName = indexerName;

        Assert.True(ExpressionHelper.IsSingleArgumentIndexer(call));
    }

    [Fact]
    public void IsSingleArgumentIndexer_DoesNotRetainCollectibleMetadata()
    {
        var (type, method) = ExerciseCollectibleIndexer();
        for (var attempt = 0; attempt < 10; attempt++)
        {
            GC.Collect();
            GC.WaitForPendingFinalizers();
            GC.Collect();
            if (!IsAlive(type) && !IsAlive(method))
            {
                break;
            }
        }

        Assert.False(IsAlive(type));
        Assert.False(IsAlive(method));
    }

    [MethodImpl(MethodImplOptions.NoInlining)]
    private static (WeakReference<Type> Type, WeakReference<MethodInfo> Method) ExerciseCollectibleIndexer()
    {
        const string IndexerName = "Entry";
        var assembly = AssemblyBuilder.DefineDynamicAssembly(
            new AssemblyName("CollectibleIndexer" + Guid.NewGuid().ToString("N")), AssemblyBuilderAccess.RunAndCollect);
        var module = assembly.DefineDynamicModule("Indexers");
        var builder = module.DefineType("Indexer", TypeAttributes.Public);
        builder.DefineDefaultConstructor(MethodAttributes.Public);
        builder.SetCustomAttribute(new CustomAttributeBuilder(
            typeof(DefaultMemberAttribute).GetConstructor(new[] { typeof(string) }), new object[] { IndexerName }));
        var getter = builder.DefineMethod("get_" + IndexerName,
            MethodAttributes.Public | MethodAttributes.SpecialName | MethodAttributes.HideBySig,
            typeof(string), new[] { typeof(int) });
        var il = getter.GetILGenerator();
        il.Emit(OpCodes.Ldstr, "value");
        il.Emit(OpCodes.Ret);
        builder.DefineProperty(IndexerName, PropertyAttributes.None, typeof(string), new[] { typeof(int) })
            .SetGetMethod(getter);
        var type = builder.CreateType();
        var method = type.GetProperty(IndexerName).GetMethod;
        Assert.Equal("value", method.Invoke(Activator.CreateInstance(type), new object[] { 3 }));
        var parameter = Expression.Parameter(type, "model");
        var call = Expression.Call(parameter, method, Expression.Constant(3));

        Assert.True(ExpressionHelper.IsSingleArgumentIndexer(call));
        Assert.Equal("[3]", ExpressionHelper.GetUncachedExpressionText(Expression.Lambda(call, parameter)));

        return (new WeakReference<Type>(type), new WeakReference<MethodInfo>(method));
    }

    [MethodImpl(MethodImplOptions.NoInlining)]
    private static bool IsAlive<T>(WeakReference<T> reference) where T : class
    {
        return reference.TryGetTarget(out _);
    }

    private class TestModel
    {
        public string Name { get; set; }
        public string Model { get; set; }
        public Category SelectedCategory { get; set; }

        public IList<Category> PreferredCategories { get; set; }
    }

    private class LowerModel
    {
        public string name { get; set; }

        public string model { get; set; }

        public Category selectedcategory { get; set; }

        public IList<Category> preferredcategories { get; set; }
    }

    private class Category
    {
        public int CategoryId { get; set; }
        public CategoryName CategoryName { get; set; }
    }

    private class CategoryName
    {
        public string MainCategory { get; set; }
        public string SubCategory { get; set; }
    }

    private static class AStaticClass
    {
        public static string Model { get; set; }
        public static string Test { get; set; }
    }

    private static class AnotherStaticClass
    {
        public static Model.Model Model { get; set; }
        public static Model.Model Test { get; set; }
    }
}
