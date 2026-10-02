const fs=require('node:fs');
require('esbuild').buildSync({entryPoints:['speech-sdk-entry.js'],bundle:true,minify:true,platform:'browser',outfile:'speech-sdk.js'});
// Pin the SDK's output resampler fallback to the same self-hosted worklet.
const path='speech-sdk.js';fs.writeFileSync(path,fs.readFileSync(path,'utf8').replaceAll('https://cdn.jsdelivr.net/npm/@alexanderolsen/libsamplerate-js@2.1.2/dist/libsamplerate.worklet.js','/libsamplerate.worklet.js'));
for(const file of ['rawAudioProcessor.js','audioConcatProcessor.js'])fs.copyFileSync('node_modules/@elevenlabs/client/worklets/'+file,file);
fs.copyFileSync('node_modules/@alexanderolsen/libsamplerate-js/dist/libsamplerate.worklet.js','libsamplerate.worklet.js');
