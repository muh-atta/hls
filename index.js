const express = require('express')
const upload = require('./middlewares/multer')
const { exec } = require('child_process');
const fs = require('fs');
const uuid = require('uuid');
const path = require('path')
const cors = require('cors')

const PORT = 3000;

const app = express();

const corsOptions = {
    origin: "*",
};
app.use(cors(corsOptions));
app.use(express.json());
app.use("/public", express.static(path.join(__dirname, "public")));
const chapters = {}

app.post('/upload', upload.single('video'), (req, res) => {
    const chapterId = uuid.v4(); // Generate a unique chapter ID
    const videoPath = req.file.path;
    const outputDir = `public/videos/${chapterId}`;
    const outputFileName = 'output.m3u8';
    const outputPath = path.join(outputDir, outputFileName);

    // Check if output directory exists, create if not
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    // Command to convert video to HLS format using ffmpeg
    const command = `ffmpeg -i ${videoPath} \
    -map 0:v -crf 23 -preset medium \
    -map 0:v -crf 28 -preset medium \
    -map 0:v -crf 32 -preset medium \
    -map 0:a? -c:a aac -b:a 128k \
    -hls_time 10 -hls_list_size 6 -f hls ${outputPath}`;

    // Execute ffmpeg command
    exec(command, (error, stdout, stderr) => {
        if (error) {
            console.error(`ffmpeg exec error: ${error}`);
            return res.status(500).json({ error: 'Failed to convert video to HLS format' });
        }
        console.log(`stdout: ${stdout}`);
        console.error(`stderr: ${stderr}`);
        const videoUrl = `public/videos/${chapterId}/${outputFileName}`;
        chapters[chapterId] = { videoUrl, title: req.body.title }; // Store chapter information
        res.json({ success: true, message: 'Video uploaded and converted to HLS.', chapterId });
    });
});

app.get('/getVideo', (req, res) => {
    const { chapterId } = req.query;
    if (!chapterId || !chapters[chapterId]) {
        return res.status(404).json({ error: 'Chapter not found' });
    }
    const { title, videoUrl } = chapters[chapterId];
    console.log(title, " ", videoUrl)
    res.json({ title: title, url: videoUrl });
});


app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`)
})