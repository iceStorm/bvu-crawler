
const interval = 180000;    //  Auto every 30mins
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


app.listen(process.env.PORT || 5000, () =>
{
    console.log(`App started on port ${5000}.\n`);

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
        res.status(200);
        res.send("Successfully.");
        // readPDFToText(path);
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
    // const path = require('path');


    try
    {
        if (fs.existsSync(`./schedules/${date}`))
        {
            console.log("Directory exists.")
            return `./schedules/${date}/schedule.pdf`;
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
    console.log("\nAuto cronjob ...");
    const crawler = require('./crawler');
    crawler.doCrawl();
}