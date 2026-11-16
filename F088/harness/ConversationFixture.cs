using Microsoft.AspNetCore.Components;
using Microsoft.AspNetCore.Components.AI;
using Microsoft.AspNetCore.Components.Rendering;
using Microsoft.Extensions.AI;

namespace AutoPerf;

public sealed class ConversationRoot : ComponentBase
{
    [Parameter]
    public UIAgent Agent { get; set; } = default!;

    [Parameter]
    public bool Custom { get; set; }

    protected override void BuildRenderTree(RenderTreeBuilder builder)
    {
        builder.OpenComponent<AgentBoundary>(0);
        builder.AddComponentParameter(1, nameof(AgentBoundary.Agent), Agent);
        builder.AddComponentParameter(2, nameof(AgentBoundary.ChildContent), (RenderFragment)(child =>
        {
            child.OpenComponent<MessageList>(0);
            child.AddComponentParameter(1, nameof(MessageList.ChildContent), (RenderFragment)(content =>
            {
                if (Custom)
                {
                    content.OpenComponent<BlockRenderer<RichContentBlock>>(0);
                    content.AddComponentParameter(1, nameof(BlockRenderer<RichContentBlock>.ChildContent),
                        (RenderFragment<RichContentBlock>)(_ => markup =>
                            markup.AddMarkupContent(0, "<span class=\"f088-custom-block\">custom</span>")));
                    content.CloseComponent();
                }
                content.OpenComponent<ConversationSender>(2);
                content.CloseComponent();
            }));
            child.CloseComponent();
        }));
        builder.CloseComponent();
    }
}

public sealed class ConversationSender : ComponentBase
{
    [CascadingParameter]
    public AgentContext AgentContext { get; set; } = default!;

    protected override Task OnInitializedAsync() => AgentContext.SendMessageAsync("render table");
}

internal sealed class SnapshotClient(AIContent content) : IChatClient
{
    public int Calls { get; private set; }
    public int Updates { get; private set; }

    public async IAsyncEnumerable<ChatResponseUpdate> GetStreamingResponseAsync(
        IEnumerable<ChatMessage> messages,
        ChatOptions? options = null,
        [System.Runtime.CompilerServices.EnumeratorCancellation] CancellationToken cancellationToken = default)
    {
        cancellationToken.ThrowIfCancellationRequested();
        Calls++;
        Updates++;
        yield return new ChatResponseUpdate
        {
            Role = ChatRole.Assistant,
            MessageId = "table-alignment",
            Contents = [content],
        };

        await Task.CompletedTask;
    }

    public Task<ChatResponse> GetResponseAsync(
        IEnumerable<ChatMessage> messages, ChatOptions? options = null, CancellationToken cancellationToken = default)
    {
        throw new NotSupportedException("This deterministic provider emits streaming snapshots only.");
    }

    public object? GetService(Type serviceType, object? serviceKey = null)
    {
        return serviceType == typeof(IChatClient) ? this : null;
    }

    public void Dispose()
    {
    }
}
