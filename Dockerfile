FROM --platform=linux/amd64 node:16

# Create app directory
WORKDIR /usr/src/app

# copy app dependencies
COPY package*.json ./

# Bundle app source
COPY . .

RUN npm install

# make start.sh executable
RUN chmod u+x start.sh

EXPOSE 3000

#CMD ["./start.sh"]