#!/bin/bash
if which brew > /dev/null
then
	echo "brew is installed"
else
	echo "brew is not installed"
	if xcode-select --install > /dev/null
	then
		echo "command line tool not installed"
	else
		echo "command line tool is installed"
	fi
	/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
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
npm install -g chromedriver

if which python3 > /dev/null
	then
		echo "python3 is installed, skipping..."
	else
		echo "python3 is not installed"
		brew install python3
fi
pip3 install --user numpy
pip3 install --user requests
pip3 install --user opencv-python
