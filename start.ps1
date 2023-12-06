
# set location to AAS folder
Set-Location $PSScriptRoot

# create log folder if it doesn't exist
# if (!(Test-Path -Path "./log")){
#     mkdir log
# }

# make sure chromedriver version is compatible with chrome version
npm install -g chromedriver --detect_chromedriver_version

# add chromedriver exec to path environment variable
$chromedriver = (Split-Path $PSScriptRoot -Parent) + "\AppData\Roaming\npm\node_modules\chromedriver\lib\chromedriver"
$env:Path += ";$chromedriver"

# start program
node index.js
