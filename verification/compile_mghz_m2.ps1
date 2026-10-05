param([string]$Project, [string]$Out)
$igor = "C:\ProgramData\GameMakerStudio2-LTS2026\Cache\runtimes\runtime-2026.0.0.23\bin\igor\windows\x64\Igor.exe"
New-Item -ItemType Directory -Force "$Out\cache", "$Out\temp", "$Out\output" | Out-Null
& $igor "--project=$Project" "--user=C:\Users\james\AppData\Roaming\GameMakerStudio2-LTS2026\unknownUser_unknownUserID" "--rp=C:\ProgramData\GameMakerStudio2-LTS2026\Cache\runtimes\runtime-2026.0.0.23" "--cache=$Out\cache" "--temp=$Out\temp" -r=VM "--of=$Out\output\SonicChaos_POC.zip" windows PackageZip *> "$Out\compile.log"
"exit $LASTEXITCODE" | Out-File "$Out\compile.exit"
