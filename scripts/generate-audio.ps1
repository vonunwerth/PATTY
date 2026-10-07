$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Speech
$parabelSpeaker = New-Object System.Speech.Synthesis.SpeechSynthesizer
$parabelSpeaker.SelectVoice('Microsoft Zira Desktop')
$parabelSpeaker.Rate = 1
$parabelRoot = Split-Path $PSScriptRoot -Parent
$parabelAudio = Join-Path $parabelRoot 'static/audio'
New-Item -ItemType Directory -Force -Path $parabelAudio | Out-Null
$parabelTexts = @('Thirty seconds.', 'Twenty.', 'Ten.', 'Five.', 'Four.', 'Three.', 'Two.', 'One.', 'Pull up.', 'Thirty.', 'Forty.', 'Injection.', 'Pull out.', 'Steady flight.', 'One minute. P one. Five, four, three, two, one. Pull up.')
1..100 | ForEach-Object { $parabelTexts += "One minute. P $_." }
$parabelManifest = [ordered]@{}
try {
    for ($parabelIndex = 0; $parabelIndex -lt $parabelTexts.Count; $parabelIndex++) {
        $parabelFilename = "call-$parabelIndex.wav"
        $parabelSpeaker.SetOutputToWaveFile((Join-Path $parabelAudio $parabelFilename))
        $parabelSpeaker.Speak($parabelTexts[$parabelIndex])
        $parabelSpeaker.SetOutputToNull()
        $parabelManifest[$parabelTexts[$parabelIndex]] = "./audio/$parabelFilename"
    }
} finally {
    $parabelSpeaker.Dispose()
}
$parabelJson = $parabelManifest | ConvertTo-Json
Set-Content -LiteralPath (Join-Path $parabelRoot 'static/speech-assets.js') -Value "export default $parabelJson;" -Encoding utf8
Write-Output "Generated $($parabelTexts.Count) English announcements."
