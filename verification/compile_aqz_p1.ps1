param([Parameter(Mandatory=$true)][string]$Project, [Parameter(Mandatory=$true)][string]$Out)
$runtime = 'C:\ProgramData\GameMakerStudio2-LTS2026\Cache\runtimes\runtime-2026.0.0.23'
$userProfile = 'C:\Users\james\AppData\Roaming\GameMakerStudio2-LTS2026\jamesfarnham_5120486'
New-Item -ItemType Directory -Force "$Out\cache", "$Out\temp", "$Out\output" | Out-Null
& "$runtime\bin\igor\windows\x64\Igor.exe" "--project=$Project" "--user=$userProfile" "--rp=$runtime" "--cache=$Out\cache" "--temp=$Out\temp" -r=VM "--of=$Out\output\data.win" "--tf=$Out\output\Windows.zip" windows PackageZip *> "$Out\compile.log"
$compileCode = $LASTEXITCODE
"exit $compileCode" | Set-Content "$Out\compile.exit"
if ($compileCode -ne 0 -or !(Test-Path -LiteralPath "$Out\output\Windows.zip")) {Get-Content "$Out\compile.log" -Tail 40;exit 1}
Get-Content "$Out\compile.log" -Tail 8
