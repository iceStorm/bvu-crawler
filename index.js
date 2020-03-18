
const interval = 1800000;    //  Auto run every 30mins
const fs = require('fs');
const logger = require('morgan');
const http = require('http');
const bodyParser = require('body-parser');
const express = require('express');
const request = require('request');
const router = express();
const app = express();


app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));
var server = http.createServer(app);


app.listen(process.env.PORT || 3000, () =>
{
    console.log(`App started on port ${3000}.\n`);

    letCrawl();
    setInterval(() =>
    {
        letCrawl();
    }, interval);
});
app.get('/', (req, res) => { res.send("Server chạy ngon lành."); });
app.get('/schedules',function(req, res)
{
    const date = req.query.date;
    var path = getFilePath(date);


    if (path !== "")
    {
        var data = fs.readFileSync(path);
        res.contentType("application/pdf");
        res.status(200).send(data);
    }
    else
    {
        res.status(404);
        res.send("Chưa có lịch.");
    }
});



function getFilePath(date)
{
    console.log("Required: " + date);
    const path = `./schedules/${date}/schedule_${date}.pdf`;


    try
    {
        if (fs.existsSync(path))
        {
            console.log("Directory exists.")
            return path;
        }
        else
        {
            console.log("Directory does not exist.")
            return "";
        }
    }
    catch(e)
    {
        console.log("An error occurred." + e)
        return "";
    } 
}


function letCrawl()
{
    try
    {
        console.log("\nAuto crawl starting ...");
        const crawler = require('./crawler');
        crawler.doCrawl();
    }
    catch(err)
    {
        console.log(err);
    }
}