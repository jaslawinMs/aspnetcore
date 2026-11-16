namespace AutoPerf;

internal sealed record Spec(string Label, string Mode, int ContentLength, string Kind = "raw", int NameLength = 8, int? ExactOutputLength = null);

internal static class Cases
{
    internal static readonly Spec[] All =
    [
        new("EncodeEmpty", "Encode", 0), new("EncodeSmall", "Encode", 32), new("Encode1K", "Encode", 1024),
        new("Encode16K", "Encode", 16384), new("Encode128K", "Encode", 131072),
        new("EncodeEscaped16K", "Encode", 16384, "escaped"), new("EncodeUnicode16K", "Encode", 16384, "unicode"),
        new("EncodeLongKey", "Encode", 32, NameLength: 4096), new("EncodeBothLarge", "Encode", 131072, NameLength: 4096),
        new("EncodeBelow256", "Encode", 0, ExactOutputLength: 255), new("EncodeAt256", "Encode", 0, ExactOutputLength: 256),
        new("EncodeAbove256", "Encode", 0, ExactOutputLength: 257),
        new("EncodeBelow64K", "Encode", 0, ExactOutputLength: 65535), new("EncodeAt64K", "Encode", 0, ExactOutputLength: 65536),
        new("EncodeAbove64K", "Encode", 0, ExactOutputLength: 65537),
        new("MissSmall", "Miss", 32), new("Miss1K", "Miss", 1024), new("Miss16K", "Miss", 16384),
        new("Miss128K", "Miss", 131072), new("MissEscaped16K", "Miss", 16384, "escaped"),
        new("MissUnicode16K", "Miss", 16384, "unicode"), new("MissLongKey", "Miss", 32, NameLength: 4096),
        new("HitSmall", "Hit", 32), new("Hit16K", "Hit", 16384), new("Hit128K", "Hit", 131072),
        new("Disabled16K", "Disabled", 16384), new("FormatterSmall", "Formatter", 32), new("Formatter16K", "Formatter", 16384),
    ];
}
