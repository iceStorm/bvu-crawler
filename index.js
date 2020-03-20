
const interval = 300000;    //  Auto crawling each 5mins
const crawler = require('./crawler');
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


const port = 5000;
app.listen(process.env.PORT || port, () =>
{
    console.log(`App started on port ${port}.\n`);
    setInterval(() =>
    {
        letCrawl();
    }, interval);
});

app.get('/', (req, res) => { res.send("Server chạy ngon lành."); });

app.get('/schedules',function(req, res)
{
    const date = req.query.date;
    const classname = req.query.class;
    var path = getFilePath(date);


    if (path !== "")
    {
        if (classname)
        {
            let json = getJSONbyClassName(path, classname);
            res.contentType("text/html");
            res.status(200).send(json);
        }
        else
        {
            var data = fs.readFileSync(path);
            res.contentType("text/html");
            res.status(200).send(data);
        }
    }
    else
    {
        res.status(404).send("Chưa có lịch.");
    }
});



function getFilePath(date)
{
    console.log("Required: " + date);
    const path = `./schedules/${date}/schedule_${date}.txt`;


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
        crawler.doCrawl();
    }
    catch(err)
    {
        console.log(err);
    }
}


function getJSONbyClassName(filename, expectedClassname)
{
    let classes = [];
    let json = fs.readFileSync(filename, {encoding: 'utf8'});
    json = JSON.parse(json);
    // console.log(json);

    for (let i = 0; i < json.length; ++i)
    {
        let subjects = json[i].Subjects;
        for (let j = 0; j < subjects.length; ++j)
        {
            let classname = subjects[j].Class.toLowerCase();
            if (classname === expectedClassname.toLowerCase())
                classes.push(subjects[j]);
        }
    }

    return classes;
}