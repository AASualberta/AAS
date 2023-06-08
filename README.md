# AAS

## Program Setup
MAKE SURE THE PULSESENSOR IS CONNECTED AND Getting_BPM_to_Monitor.ino IS UPLOADED TO THE ARDUINO.

The program is able to run offline when it is initialized successfully.
### For Mac users:

#### If you have installed **Node**, and **chromedriver**, 
* start the program:
```shell
npm install
chmod u+x start.sh
./start.sh
```
* Open another browser window, and go to [localhost:3000](http://localhost:3000/)
---
#### If you havn't installed **Node**, and **chromedriver**, 

* Download the project.
```shell
git clone https://github.com/YouruiGuo/AAS.git
cd AAS
```
* Install dependencies. You may need to enter password for downloading dependencies.
```shell
chmod u+x script.sh
sudo ./script.sh
```

* Start the program:
```shell
npm install
chmod u+x start.sh
./start.sh
```
* Open another browser window, and go to [localhost:3000](http://localhost:3000/)

---

#### Uninstall all dependencies and packages:
```shell
chmod u+x uninstall_script.sh
./uninstall_script.sh
```
