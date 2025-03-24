import * as express from 'express';
import * as bodyParser from 'body-parser';
import fetch from 'node-fetch';

const app = express();

const port = process.env.PORT ? parseInt(process.env.PORT) : 80;

// 中间件设置
app.use(bodyParser.text({ type: '*/*' }));
// 如果需要静态文件服务，取消注释以下行
// app.use(express.static('public'));
// app.use(express.static('html'));

// 允许跨域
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  next();
});

// ms-ra-forwarder 的原有路由（可选）
if (require.resolve('./api/legado')) app.get('/api/legado', require('./api/legado'));
if (require.resolve('./api/aiyue')) app.get('/api/aiyue', require('./api/aiyue'));
if (require.resolve('./api/ireadnote')) app.get('/api/ireadnote', require('./api/ireadnote'));
app.post('/api/ra', require('./api/ra'));

// 中间件的新路由：/tts
app.get('/tts', async (req, res) => {
  const { voiceName, voiceStyle, rate, text } = req.query;

  const finalVoiceName = voiceName || 'zh-CN-XiaoxiaoNeural';
  const finalVoiceStyle = voiceStyle || 'default'; // 未使用，但保留
  const finalRate = rate || '0'; // 未使用，但保留
  const finalText = text || '测试文本';

  const ssml = `<speak xmlns="http://www.w3.org/2001/10/synthesis" xmlns:mstts="http://www.w3.org/2001/mstts" xmlns:emo="http://www.w3.org/2009/10/emotionml" version="1.0" xml:lang="zh-CN"><voice name="${finalVoiceName}">${finalText}</voice></speak>`;

  try {
    const raResponse = await new Promise((resolve, reject) => {
      const raReq = {
        body: ssml,
        headers: {
          'format': 'audio-24khz-48kbitrate-mono-mp3',
          'authorization': process.env.TOKEN ? `Bearer ${process.env.TOKEN}` : undefined,
        },
      } as any;
      const raRes = {
        status: (code: number) => ({ json: (data: any) => reject(data), end: (data: any) => resolve(data) }),
        setHeader: () => {},
      } as any;
      require('./api/ra')(raReq, raRes);
    });

    res.set({
      'Content-Type': 'audio/mpeg',
      'Content-Length': raResponse.length,
      'Content-Disposition': 'attachment; filename="tts_audio.mp3"',
    });
    res.send(raResponse);
  } catch (error) {
    console.error('TTS 请求失败:', error);
    res.status(500).send('音频生成失败: ' + error.message);
  }
});

app.listen(port, () => {
  console.info(`应用正在监听 ${port} 端口`);
});
