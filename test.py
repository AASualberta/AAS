'''
Code source: https://github.com/thearn/webcam-pulse-detector

Prerequisite:
install python
pip3 install opencv-python

Run the program:
python3 test.py

'''

import cv2, time
import numpy as np


def get_subface_coord(face_rect,fh_x, fh_y, fh_w, fh_h):
    x, y, w, h = face_rect
    return [int(x + w * fh_x - (w * fh_w / 2.0)),
            int(y + h * fh_y - (h * fh_h / 2.0)),
            int(w * fh_w),
            int(h * fh_h)]

def get_subface_means(coord, frame):
    x, y, w, h = coord
    subframe = frame[y:y + h, x:x + w, :]
    v1 = np.mean(subframe[:, :, 0])
    v2 = np.mean(subframe[:, :, 1])
    v3 = np.mean(subframe[:, :, 2])

    #return (v1 + v2 + v3) / 3.
    return v2 # return the mean of green channel

cap = cv2.VideoCapture(0)
faceCascade = cv2.CascadeClassifier('haarcascade_frontalface_alt.xml')
dataBuffer = []
bufferSize = 150
t0 = time.time()
times = []

while(True):
    times.append(time.time() - t0)
    # Capture frame-by-frame
    ret, frame = cap.read()

    # Our operations on the frame come here
    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)

    faces = list(faceCascade.detectMultiScale(
        gray,
        scaleFactor=1.1,
        minNeighbors=5,
        minSize=(30, 30),
        flags=cv2.CASCADE_SCALE_IMAGE
    ))

    # Draw a rectangle around the faces
    if len(faces) > 0:


        face = x,y,w,h = faces[0]
        forehead = fx,fy,fw,fh = get_subface_coord(face, 0.5, 0.18, 0.25, 0.15)
        cv2.rectangle(frame, (x, y), (x+w, y+h), (0, 255, 0), 1) # face
        cv2.rectangle(frame, (fx, fy), (fx+fw, fy+fh), (0, 255, 0), 1) # forehead
        cv2.putText(frame, "Forehead",
                       (fx, fy), cv2.FONT_HERSHEY_PLAIN, 1.5, 1)

        vals = get_subface_means(forehead, frame)

        dataBuffer.append(vals)
        #print(dataBuffer[-bufferSize:])
        L = len(dataBuffer)
        if L > bufferSize:
            dataBuffer = dataBuffer[-bufferSize:]
            times = times[-bufferSize:]
            L = bufferSize
        samples = np.array(dataBuffer)
        #print(samples)

        if L >= bufferSize:
            fps = float(L) / (times[-1] - times[0])
            even_times = np.linspace(times[0], times[-1], L)
            interpolated = np.interp(even_times, times, samples)
            interpolated *= np.hamming(L)
            interpolated -= np.mean(interpolated)

            raw = np.fft.rfft(interpolated)
            #print(interpolated, raw)

            phase = np.angle(raw)
            fft = np.abs(raw)
            #print(phase, fft)

            freqs = float(fps) / L * np.arange(L // 2 + 1)
            freqs = 60. * freqs
            #print(freqs)
            idx = np.where((freqs > 45) & (freqs < 180))
            #print(fft, freqs)
            fft = fft[idx]
            phase = phase[idx]
            freqs = freqs[idx]
            idx2 = np.argmax(fft)
            bpm = freqs[idx2]


            text = "(estimate: %0.1f bpm)" % (bpm)
            cv2.putText(frame, text,
                           (int(x - w / 2), int(y)), cv2.FONT_HERSHEY_PLAIN, 1, (100, 255, 100))



    # Display the resulting frame
    cv2.imshow('Video', frame)

    if cv2.waitKey(1) & 0xFF == ord('q'):
        break

# When everything done, release the capture
cap.release()
cv2.destroyAllWindows()