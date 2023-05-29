FROM --platform=linux/amd64 node:16

# Create app directory
WORKDIR /usr/src/app

# copy app dependencies
COPY package*.json ./

RUN apt-get clean

RUN apt-get update
    # We need wget to set up the PPA and xvfb to have a virtual screen and unzip to install the Chromedriver
RUN apt-get install -y gnupg wget curl unzip --no-install-recommends
    # Set up the Chrome PPA
RUN wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | apt-key add - && \
    echo "deb http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list && \
    # Update the package list and install chrome
    apt-get update -y && \
    apt-get install -y google-chrome-stable && \
    # Install app dependencies
    npm install && \
    # Install Chromedriver version matching Chrome version https://gist.github.com/varyonic/dea40abcf3dd891d204ef235c6e8dd79
    npm install -g chromedriver --detect_chromedriver_version

# Bundle app source
COPY . .

# make start.sh executable
RUN chmod u+x start.sh

EXPOSE 3000

#CMD ["./start.sh"]