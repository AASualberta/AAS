if which brew > /dev/null; then
  # The package is installed
  echo "brew installed"
  brew update
else
  # The package is not installed
  echo "brew not installed"
  /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/master/install.sh)"
fi

if which node > /dev/null
    then
        echo "node is installed, skipping..."
    else
        # add deb.nodesource repo commands
        # install node
        echo "not installed"
        brew install node
    fi
npm install
npm -g install chromedriver
