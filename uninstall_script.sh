for package in `ls node_modules`;
  do npm uninstall $package;
done;
npm -g uninstall chromedriver
brew uninstall node
Kernel.exec "/bin/bash", "-c", '/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/master/uninstall.sh)"' + ' uninstall ' +  ARGV.join(" ")
