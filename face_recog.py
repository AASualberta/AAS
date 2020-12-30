import requests

d = {"rmssd": 123} # Root Mean Square of the Successive Differences

r = requests.post('http://127.0.0.1:3000/test', data=d)
print(r)

