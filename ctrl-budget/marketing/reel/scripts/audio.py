import json, sys, subprocess, numpy as np
S = sys.argv[1]; SR = 44100; DUR = 90.0
rng = np.random.default_rng(7)
def t_(d): return np.arange(int(d*SR))/SR
def env(d, a=.003, r=None):
    t=t_(d); e=np.minimum(1,t/a); return e*np.exp(-t/(r or d/4))
def lp(x, fc):  # one-pole low pass, fc may be array
    fc=np.broadcast_to(fc,x.shape); y=np.zeros_like(x); s=0.
    al=1-np.exp(-2*np.pi*fc/SR)
    for i in range(len(x)): s+=al[i]*(x[i]-s); y[i]=s
    return y
def bell(f, d=1.2, amp=.3):
    t=t_(d); return amp*sum(w*np.sin(2*np.pi*f*m*t)*np.exp(-t*k) for m,w,k in [(1,1,4),(2.76,.4,7),(5.4,.2,12),(2,.25,6)])*np.minimum(1,t/.002)
def sweep(f0,f1,d):
    t=t_(d); f=f0*(f1/f0)**(t/d); return np.sin(2*np.pi*np.cumsum(f)/SR)
def noise(d): return rng.standard_normal(int(d*SR))
FX = {}
FX['key'] = lambda: .12*np.diff(np.r_[0,noise(.03)])*env(.03,.0005,.006) + .05*np.sin(2*np.pi*rng.uniform(1800,2600)*t_(.03))*env(.03,.0005,.005)
FX['tap'] = lambda: .25*np.diff(np.r_[0,noise(.05)])*env(.05,.0005,.008) + .35*np.sin(2*np.pi*180*t_(.05))*env(.05,.001,.012)
FX['pop'] = lambda: .45*sweep(1100,380,.09)*env(.09,.001,.03)
def whoosh(d=.42, peak=.3, lo=300, hi=4000, amp=.5):
    t=t_(d); n=noise(d); fc=lo+(hi-lo)*np.sin(np.pi*np.clip(t/(2*peak),0,1))**2
    e=np.where(t<peak,(t/peak)**2,np.exp(-(t-peak)/.05)); return amp*lp(n,fc)*e/0.5
FX['whoosh'] = lambda: whoosh()
FX['swipe'] = lambda: whoosh(.22,.12,800,6000,.35)
FX['ding'] = lambda: bell(1318.5,1.4,.28)
FX['end'] = lambda: bell(1046.5,2.0,.25)+np.r_[np.zeros(int(.12*SR)),bell(1568,1.88,.2)][:int(2*SR)]
def seq(*parts):
    L=max(int(o*SR)+len(x) for o,x in parts); y=np.zeros(L)
    for o,x in parts: y[int(o*SR):int(o*SR)+len(x)]+=x
    return y
FX['success'] = lambda: seq((0,bell(1046.5,.8,.2)),(.09,bell(1318.5,.8,.2)),(.18,bell(1568,1.2,.24)))
def sq(f,d,amp): t=t_(d); return amp*np.tanh(3*np.sin(2*np.pi*f*t))*env(d,.001,d/3)
FX['coin'] = lambda: seq((0,sq(988,.08,.12)),(.075,sq(1319,.45,.14)))
FX['cash'] = lambda: seq((0,.3*np.diff(np.r_[0,noise(.06)])*env(.06,.001,.015)),(.05,bell(2093,1,.18)),(.12,bell(2637,1.2,.2)))
FX['impact'] = lambda: seq((0,.8*sweep(90,32,.9)*env(.9,.002,.25)),(0,.35*lp(noise(.12),2500)*env(.12,.001,.03)/0.3))
FX['riser'] = lambda: (lambda t: (.25*lp(noise(1.55),300+3500*(t/1.55)**2)/0.4 + .12*sweep(180,1400,1.55))*(t/1.55)**2.2)(t_(1.55))
FX['alert'] = lambda: seq((0,.18*np.sin(2*np.pi*880*t_(.14))*env(.14,.002,.06)),(.13,.18*np.sin(2*np.pi*622*t_(.3))*env(.3,.002,.1)))
FX['notif'] = lambda: seq((0,bell(1568,.5,.13)),(.1,bell(2093,.8,.13)))
GAIN = {'key':.45,'tap':.45,'pop':.6,'whoosh':.32,'swipe':.3,'ding':.7,'success':.8,'coin':1,'cash':.8,'impact':.45,'riser':.6,'alert':1,'notif':1,'end':.6}
sfx = np.zeros(int((DUR+3)*SR))
cues = json.load(open(f'{S}/out/sfx.json'))
for t, name in cues:
    x = FX[name]()*GAIN[name]; i=int(t*SR)
    if i<0: x=x[-i:]; i=0
    sfx[i:i+len(x)] += x[:len(sfx)-i]
sfx = sfx[:int(DUR*SR)]
# musique : Openverse / Jamendo, démarrée à 6 s pour que le drop tombe à t = 2 s
m = subprocess.run(['ffmpeg','-v','error','-ss','6','-t',str(DUR),'-i',f'{S}/dl/music1.mp3','-ac','2','-ar',str(SR),'-f','f32le','-'],capture_output=True).stdout
m = np.frombuffer(m,dtype=np.float32).reshape(-1,2).astype(float)
m = np.pad(m,((0,max(0,int(DUR*SR)-len(m))),(0,0)))[:int(DUR*SR)]
tt = np.arange(len(m))/SR
g = .55*np.ones_like(tt)
g *= np.clip((DUR-tt)/1.8,0,1)            # fondu de fin
g *= np.where(tt<2.0, .75, 1)             # intro plus douce avant le drop
m *= g[:,None]
mix = m + np.stack([sfx,sfx],1)*.9
peak = np.abs(mix).max(); print('peak',peak, 'cues',len(cues))
mix = np.tanh(mix*1.2)/1.2
subprocess.run(['ffmpeg','-y','-v','error','-f','f32le','-ar',str(SR),'-ac','2','-i','-',f'{S}/out/mix.wav'],input=mix.astype(np.float32).tobytes(),check=True)
np.save(f'{S}/out/sfx_only.npy', sfx.astype(np.float32))
