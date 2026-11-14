"""Place la voix off par séquence, baisse la musique sous la voix, mixe avec les bruitages."""
import sys, subprocess, numpy as np
S = sys.argv[1]; SR = 44100; DUR = 90.0; N = int(DUR*SR)
def load(path, ss=None, t=None, ch=1):
    a = ['ffmpeg','-v','error'] + (['-ss',str(ss)] if ss is not None else []) + (['-t',str(t)] if t else []) + ['-i',path,'-ac',str(ch),'-ar',str(SR),'-f','f32le','-']
    x = np.frombuffer(subprocess.run(a,capture_output=True).stdout,dtype=np.float32).astype(float)
    return x.reshape(-1,ch) if ch>1 else x
# (début dans la voix, fin dans la voix, position dans la vidéo), coupes faites dans les silences
SEG = [(0.0,8.30,0.0),(8.78,16.30,8.4),(16.73,23.14,18.0),(23.60,28.46,24.4),(28.80,41.23,31.0),
       (41.59,48.05,44.2),(48.47,57.50,51.3),(57.91,62.54,64.2),(62.88,71.16,72.0),(71.59,78.6,82.1)]
v = load(f'{S}/dl/voix.mp3'); vo = np.zeros(N)
for a,b,p in SEG:
    x = v[int(a*SR):int(b*SR)].copy(); f=int(.02*SR); x[:f]*=np.linspace(0,1,f); x[-f:]*=np.linspace(1,0,f)
    i=int(p*SR); vo[i:i+len(x)] += x[:N-i]
vo *= .85/np.abs(vo).max()
# enveloppe de la voix -> ducking de la musique (-10 dB)
win=int(.05*SR); e=np.sqrt(np.convolve(vo**2,np.ones(win)/win,'same')); act=(e>.02).astype(float)
k=int(.25*SR); act=np.convolve(act,np.ones(k)/k,'same'); act=np.clip(act*2,0,1)
duck = 1 - act*(1-10**(-10/20))
m = load(f'{S}/dl/music1.mp3', 6, DUR, 2); m=np.pad(m,((0,max(0,N-len(m))),(0,0)))[:N]
tt=np.arange(N)/SR; g=.55*np.clip((DUR-tt)/1.8,0,1)*np.where(tt<2,.75,1)*duck
m*=g[:,None]
sfx=np.load(f'{S}/out/sfx_only.npy').astype(float)[:N]*.6
mix=m+np.stack([sfx+vo,sfx+vo],1)
mix=np.tanh(mix*1.1)/1.1
subprocess.run(['ffmpeg','-y','-v','error','-f','f32le','-ar',str(SR),'-ac','2','-i','-',f'{S}/out/mix_vo.wav'],input=mix.astype(np.float32).tobytes(),check=True)
print('ok')
