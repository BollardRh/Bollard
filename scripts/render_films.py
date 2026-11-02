from PIL import Image, ImageDraw, ImageFont, ImageEnhance
from io import BytesIO
from pathlib import Path
import struct, math

ROOT=Path(__file__).resolve().parents[1]
source=Image.open(ROOT/'dist/assets/monument.png').convert('RGB')
serif='/System/Library/Fonts/Supplemental/Georgia.ttf'
sans='/System/Library/Fonts/Helvetica.ttc'
def chunk(k,d): return k+struct.pack('<I',len(d))+d+(b'\0' if len(d)%2 else b'')
def lst(k,d): return chunk(b'LIST',k+d)
def render(name,w,h,duration,fps):
    frames=[]; total=duration*fps
    for n in range(total):
        t=n/fps; z=1.04+.035*t/duration; s=max(w/source.width,h/source.height)*z
        im=source.resize((int(source.width*s),int(source.height*s)),Image.Resampling.LANCZOS)
        im=im.crop(((im.width-w)//2,(im.height-h)//2,(im.width+w)//2,(im.height+h)//2)).convert('RGBA')
        im=Image.alpha_composite(im,Image.new('RGBA',(w,h),(227,238,244,175))).convert('RGB'); d=ImageDraw.Draw(im)
        x=int(w*.075); big=int(w*(.082 if h>w else .063)); sm=max(12,int(w*(.022 if h>w else .015)))
        title=ImageFont.truetype(serif,big); body=ImageFont.truetype(sans,sm); bold=ImageFont.truetype(sans,sm,index=1)
        d.text((x,h*.1),'BOLLARD  /  AGENT RATINGS',font=bold,fill=(40,57,69))
        scenes=[('Trust needs','a crash test.'),('AI agents can','touch money.'),('Test the version.','Read the evidence.'),('Bollard.','Crash ratings for AI agents.')]
        a,b=scenes[min(3,int(t/(duration/4)))]; d.text((x,h*.34),a,font=title,fill=(31,45,55));d.text((x,h*.44),b,font=title if len(b)<26 else ImageFont.truetype(serif,int(big*.67)),fill=(166,58,42))
        d.text((x,h*.84),'A PLANNED SYSTEM  •  BASE + ROBINHOOD CHAIN',font=body,fill=(40,57,69));d.text((x,h*.89),'A rating is a test result, not a guarantee.',font=body,fill=(40,57,69))
        out=BytesIO();im.save(out,format='JPEG',quality=76,optimize=True);frames.append(out.getvalue())
    maxsize=max(map(len,frames)); rate=fps
    avih=struct.pack('<IIIIIIIIII4I',int(1_000_000/fps),maxsize*fps,0,0x10,total,0,1,maxsize,w,h,0,0,0,0)
    strh=struct.pack('<4s4sIHHIIIIIIIIhhhh',b'vids',b'MJPG',0,0,0,0,1,rate,0,total,maxsize,0xffffffff,0,0,0,w,h)
    strf=struct.pack('<IiiHH4sIiiII',40,w,h,1,24,b'MJPG',w*h*3,0,0,0,0)
    hdrl=lst(b'hdrl',chunk(b'avih',avih)+lst(b'strl',chunk(b'strh',strh)+chunk(b'strf',strf)))
    movi_data=b''; idx=b''; offset=4
    for frame in frames:
        entry=chunk(b'00dc',frame);idx+=struct.pack('<4sIII',b'00dc',0x10,offset,len(frame));movi_data+=entry;offset+=len(entry)
    data=b'AVI '+hdrl+lst(b'movi',movi_data)+chunk(b'idx1',idx)
    path=ROOT/'dist/assets'/name;path.write_bytes(b'RIFF'+struct.pack('<I',len(data))+data)
    print(path, len(frames), 'frames', path.stat().st_size,'bytes')
render('bollard-overview.avi',960,540,12,12)
render('bollard-portrait.avi',540,960,8,12)
