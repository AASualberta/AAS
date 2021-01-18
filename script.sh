
if which node > /dev/null
    then
        echo "node is installed, skipping..."
    else
        # add deb.nodesource repo commands
        # install node
        echo "not installed"
        curl "https://nodejs.org/dist/latest/node-${VERSION:-$(wget -qO- https://nodejs.org/dist/latest/ | sed -nE 's|.*>node-(.*)\.pkg</a>.*|\1|p')}.pkg" > "$HOME/Downloads/node-latest.pkg" && sudo installer -store -pkg "$HOME/Downloads/node-latest.pkg" -target "/"
    fi
npm install
npm -g install chromedriver

if which python3 > /dev/null
	then
		echo "python3 is installed, skipping..."
	else
		echo "python3 is not installed"
		if xcode-select --install > /dev/null
		then
			echo "command line tools not installed"
			/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
			brew install python3
		else
			echo "command line tools installed"
	fi
fi
pip3 install requests
pip3 install opencv-python
