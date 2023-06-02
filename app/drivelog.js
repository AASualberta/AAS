const fs = require('fs');
const crypto = require('crypto');
const readline = require('readline');
const {google, GoogleApis} = require('googleapis');
const directory = '1LWOoQZ5d6cGFHcP5IQDF2LMlp4NWupTg'; // id of directory you want the files uploaded in, must be shared with service account

const KEYFILEPATH = './aasualberta-be6a574fbac8.json' // paste path to your google services auth keyfile here
const SCOPES = ['https://www.googleapis.com/auth/drive'];
const auth = new google.auth.GoogleAuth({
    keyFile: KEYFILEPATH,
    scopes: SCOPES
})
const driveService = google.drive({version:"v3", auth});

function encryptString (plaintext) {
    const publicKey = fs.readFileSync("./public_key.pem", "utf8");
  
    // publicEncrypt() method with its parameters
    const encrypted = crypto.publicEncrypt(
         publicKey, Buffer.from(plaintext));
    return encrypted.toString("base64");
}

class Drive {
    constructor(username){
        this.filename = username + ".log";
        this.localfilename = "./log/" + username + ".log";
    }

    async createAndUploadFile(){

        let metadata = {
            'name': this.filename,
            'parents': [directory]
        };
        
        var content = fs.createReadStream(this.localfilename)
        content = encryptString(content)
        let media = {
            mimeType: 'text/plain',
            body: content
        };
    
        let response = await driveService.files.create({
            resource: metadata,
            media: media,
            fields: 'id'
        });
    
        // handle response
        let id = -1;
        switch(response.status){
            case 200:
                console.log("File created with id: " + response.data.id)
                id = response.data.id;
                break;
            default:
                console.error("Error creating file " + response.errors)
                break;        
        }
        return id;
    }
    
    async updateFile(fileId){
        var content = fs.createReadStream(this.localfilename)
        content = encryptString(content)
        let media = {
            mimeType: 'text/plain',
            body: content
        };
    
        let response = await driveService.files.update({
            fileId: fileId,
            media: media,
            fields: 'id'
        });
    
        // handle response
        let status = -1;
        switch(response.status){
            case 200:
                console.log("Updated file with id: " + response.data.id)
                status = 1;
                break;
            default:
                console.error("Error updating file " + response.errors)
                break;        
        }
        return status;
    }
}

module.exports = Drive
