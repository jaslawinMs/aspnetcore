// Artifact-only exact-method extraction; not a native producer.
using System;
using System.Text;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Connections;
using Microsoft.AspNetCore.Http.Features;
namespace Microsoft.AspNetCore.Server.Kestrel.Core.Tests;
internal static class F146SampleHandler
{
    internal static Task Run(IWebTransportSession session, ConnectionContext stream)
        => handleUnidirectionalStream(session, stream);

static async Task handleUnidirectionalStream(IWebTransportSession session, ConnectionContext stream)
{
    var inputPipe = stream.Transport.Input;

    // read some data from the stream into the memory
    var memory = new Memory<byte>(new byte[4096]);
    while (!stream.ConnectionClosed.IsCancellationRequested)
    {
        var length = await inputPipe.AsStream().ReadAsync(memory);

        var message = Encoding.Default.GetString(memory[..length].ToArray());

        await ApplySpecialCommands(session, message);

        Console.WriteLine("RECEIVED FROM CLIENT:");
        Console.WriteLine(message);

    }
}

static async Task ApplySpecialCommands(IWebTransportSession session, string message)
{
    switch (message)
    {
        case "Initiate Stream":
            var stream = await session.OpenUnidirectionalStreamAsync();
            if (stream is not null)
            {
                await stream.Transport.Output.WriteAsync(new("Created a new stream from the client and sent this message then closing the stream."u8.ToArray()));
            }
            break;
        case "Abort":
            session.Abort(256 /*No error*/);
            break;
        default:
            break; // in all other cases the string is not a special command
    }
}
}
