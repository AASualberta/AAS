# set location to this folder
Set-Location $PSScriptRoot

# Get the list of installed packages
$packages = Get-ChildItem -Path .\node_modules -Directory | ForEach-Object { $_.Name }

# Uninstall each package
foreach ($package in $packages) {
    Write-Host "Uninstalling package: $package"
    npm uninstall $package
}

# Uninstall global packages
Write-Host "Uninstalling global packages"
npm uninstall -g chromedriver

Write-Host "All packages in node_modules uninstalled successfully."

# Pause to keep the PowerShell window open
Read-Host -Prompt "Press Enter to exit"
