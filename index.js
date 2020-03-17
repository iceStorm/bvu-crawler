const cheerio = require('cheerio');
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
app.listen(process.env.PORT || 5000);
app.get('/', (req, res) => { res.send("Server chạy ngon lành."); });
app.get('/schedules',function(req, res)
{
    const date = req.query.date;
    var path = getFilePath(date);


    if (path !== "")
    {
        res.send("Successfully.");
        // readPDFToText(path);
    }
    else
    {
        res.status(404);
        res.send("Chưa có lịch.");
    }
});
app.listen(process.env.PORT || 3000);
app.get('/', (req, res) => { res.send("Server chạy ngon lành."); });



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


function readPDFToText(filename)
{
    var pdfreader = require("pdfreader");
    var rows = {}; // indexed by y-position
    

    new pdfreader.PdfReader().parseFileItems(filename, function(err, item)
    {
        if (!item || item.page)
        {
            // end of file, or page
            // printRows(lines, rows, filename.replace("pdf", "txt"));
            rows = {}; // clear rows for next page
        }
        else if (item.text)
        {
            var obj = 
            {
                department: "",
                subjectname: "",
                classname: "",
                period: "",
                teacher: "",
                notes: "",
                livetime: ""
            }


            fs.appendFileSync(filename.replace("pdf", "txt"), JSON.stringify(item) + '\n');
            // console.log(item);

            // accumulate text items into rows object, per line
            (rows[item.y] = rows[item.y] || []).push(item.text);
        }
    });

        
    function printRows(lines, rows, path)
    {
        Object.keys(rows) // => array of y-positions (type: float)
            // .sort((y1, y2) => parseFloat(y1) - parseFloat(y2)) // sort float positions
            .forEach(y =>
            {
                // console.log((rows[y] || []).join("|"));
                fs.appendFileSync(path, (rows[y]) + '\n');
            });
    }
}




function doCrawl()
{
    const URL = 'https://sinhvien.bvu.edu.vn';
    request(
        {
            url: URL,
            method: "GET",
            headers:
            {
                "Content-Type": "text/html"
            },
            strictSSL: false
        },
        function (err, res, body)
        {
            if(err)
            {
                console.log(err, "error occured while hitting URL");
            }
            else
            {
                const arr = [];
                let $ = cheerio.load(body);  //loading of complete HTML body
                $('div.body > div.item').each(function(index)
                {
                    const aTag = $(this).find('p.title > a');
                    if (aTag.length)
                    {
                        if (aTag.attr('title').indexOf('Danh mục các học phần được tổ chức giảng dạy E-Learning có lịch học vào ngày') != -1)
                        {
                            const date = aTag.attr('title').substring(aTag.attr('title').length - 10);
                            const link = `https://sinhvien.bvu.edu.vn/${aTag.attr('href')}`;
    
    
                            arr.push(`${date}|${link}`);
                        }
                    }
                });
    
    
                if (arr.length)
                {
                    getPDFs(arr);
                }
            }
        }
    );
}


function getPDFs(arr)
{
    for (var i = 0; i < arr.length; ++i)
    {
        const date = arr[i].split("|")[0];
        const link = arr[i].split("|")[1];
        // console.log();   //  the link
        // console.log();   //  the link
        

        request
        ({
            url: link,
            method: "GET",
            headers:
            {
                "Content-Type": "text/html"
            },
            strictSSL: false
        },
        function (err, res, body)
        {
            if(err)
            {
                console.log(err, "error occured while hitting URL");
            }
            else
            {
                let $ = cheerio.load(body);  //loading of complete HTML body
                $('div.body > div#ctl00_ContentPlaceHolder_ContentID').each(function(index)
                {
                    const aTag = $(this).find('>p >a');
                    const PDFlink = `https://sinhvien.bvu.edu.vn${aTag.attr('href')}`;
                    savePDF(date, PDFlink);
                });
            }
        });
    };
}


async function savePDF(date, url)
{
    date = date.split('/').join('');

    const segments = url.split("/");
    const filename = `./schedules/${date}/schedule.pdf`;
    const request = require('request');


    const fs = require('fs');
    fs.mkdirSync(`./schedules/${date}`, { recursive: true })
    let file = fs.createWriteStream(filename);


    /* Using Promises so that we can use the ASYNC AWAIT syntax */        
    await new Promise((resolve, reject) => {
        let stream = request({
            /* Here you should specify the exact link to the file you are trying to download */
            uri: url,
            headers: {
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
                'Accept-Encoding': 'gzip, deflate, br',
                'Accept-Language': 'en-US,en;q=0.9,fr;q=0.8,ro;q=0.7,ru;q=0.6,la;q=0.5,pt;q=0.4,de;q=0.3',
                'Cache-Control': 'max-age=0',
                'Connection': 'keep-alive',
                'Upgrade-Insecure-Requests': '1',
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/68.0.3440.106 Safari/537.36'
            },
            strictSSL: false
        })
            .pipe(file)
            .on('finish', () => {
                console.log(`The file is finished downloading.`);
                readPDFToText(filename);
                resolve();
            })
            .on('error', (error) => {
                reject(error);
            })
        })
        .catch(error => {
            console.log(`Something happened: ${error}`);
        });
}
