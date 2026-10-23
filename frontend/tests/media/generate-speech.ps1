param(
    [Parameter(Mandatory = $true)]
    [string] $OutputDirectory
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

Add-Type -AssemblyName System.Speech
$output = [System.IO.Path]::GetFullPath($OutputDirectory)
if (-not (Test-Path -LiteralPath $output -PathType Container)) {
    throw "Output directory does not exist: $output"
}

$voices = @{
    zira = 'Microsoft Zira Desktop'
    david = 'Microsoft David Desktop'
}
$installed = (New-Object System.Speech.Synthesis.SpeechSynthesizer).GetInstalledVoices()
$voiceInfo = @{}
foreach ($key in $voices.Keys) {
    $entry = $installed | Where-Object { $_.VoiceInfo.Name -eq $voices[$key] } | Select-Object -First 1
    if ($null -eq $entry) {
        throw "Required installed Windows speech voice is unavailable: $($voices[$key])"
    }
    $voiceInfo[$key] = [ordered]@{
        name = $entry.VoiceInfo.Name
        culture = $entry.VoiceInfo.Culture.Name
        gender = [string] $entry.VoiceInfo.Gender
    }
}

function Write-SpeechWave {
    param(
        [string] $VoiceName,
        [string] $Text,
        [string] $FileName
    )

    $synthesizer = New-Object System.Speech.Synthesis.SpeechSynthesizer
    try {
        $synthesizer.SelectVoice($VoiceName)
        $synthesizer.Rate = 0
        $synthesizer.Volume = 100
        $synthesizer.SetOutputToWaveFile((Join-Path $output $FileName))
        $synthesizer.Speak($Text)
        $synthesizer.SetOutputToNull()
    }
    finally {
        $synthesizer.Dispose()
    }
}

Write-SpeechWave $voices.zira 'A blue light is on.' 'turn-a.wav'
Write-SpeechWave $voices.david 'I hear it clearly.' 'turn-b.wav'
Write-SpeechWave $voices.zira 'We can begin now.' 'turn-c.wav'
Write-SpeechWave $voices.zira 'A blue light is on.' 'take-a.wav'
Write-SpeechWave $voices.david 'A blue light is on.' 'take-b.wav'

[ordered]@{
    generator = 'Windows System.Speech.Synthesis.SpeechSynthesizer'
    voices = $voiceInfo
    text = [ordered]@{
        turnA = 'A blue light is on.'
        turnB = 'I hear it clearly.'
        turnC = 'We can begin now.'
        takes = 'A blue light is on.'
    }
} | ConvertTo-Json -Depth 5 -Compress
