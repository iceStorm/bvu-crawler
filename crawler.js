module.exports = 
{
    doCrawl
}

const fs = require('fs');
const cheerio = require('cheerio');
const request = require('request');



function parsePDFToText(filename)
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
    const notation = 'Danh mục các học phần được tổ chức giảng dạy E-Learning có lịch học vào ngày';


    request(
    {
        url: URL,
        method: "GET",
        strictSSL: false,
        headers:
        {
            "Content-Type": "text/html"
        }
    },
    function (err, res, body)
    {
        if(err)
        {
            console.log(err, "Error occured while hitting URL.");
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
                    if (aTag.attr('title').indexOf(notation) != -1)
                    {
                        const date = aTag.attr('title').substring(aTag.attr('title').length - 10);
                        const link = `https://sinhvien.bvu.edu.vn/${aTag.attr('href')}`;
                        arr.push(`${date}|${link}`);
                    }
                }
            });


            if (arr.length)
            {
                getPDFsFromLinkList(arr);
            }
        }
    });
}


function getPDFsFromLinkList(linkList)
{
    for (var i = 0; i < linkList.length; ++i)
    {
        const date = linkList[i].split("|")[0];
        const link = linkList[i].split("|")[1];
        

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
                console.log(err, "Error occured while hitting URL.");
            }
            else
            {
                let $ = cheerio.load(body);  //loading of complete HTML body
                $('div.body > div#ctl00_ContentPlaceHolder_ContentID').each(function(index)
                {
                    //  Tìm đường dẫn (thẻ a) đến file PDF trên Website trường
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
    //  Thay thế các kí tự xoẹt trong chuỗi ngày tháng (tên file không cho phép kí tự xoẹt)
    date = date.split('/').join('');

    //  Khai báo đường dẫn đến tên file sẽ lưu
    const filename = `./schedules/${date}/schedule_${date}.pdf`;

    //  Tạo thư mục để lưu nếu chưa tồn tại
    fs.mkdirSync(`./schedules/${date}`, { recursive: true })
    let file = fs.createWriteStream(filename);


    /* Using Promises so that we can use the ASYNC AWAIT syntax */        
    await new Promise((resolve, reject) =>
    {
        let stream = request(
        {
            uri: url,
            strictSSL: false,
            headers:
            {
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
                'Accept-Encoding': 'gzip, deflate, br',
                'Accept-Language': 'en-US,en;q=0.9,fr;q=0.8,ro;q=0.7,ru;q=0.6,la;q=0.5,pt;q=0.4,de;q=0.3',
                'Cache-Control': 'max-age=0',
                'Connection': 'keep-alive',
                'Upgrade-Insecure-Requests': '1',
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/68.0.3440.106 Safari/537.36'
            }
        })
            .pipe(file)
                .on('finish', () =>
                {
                    console.log(`Finished downloading: ${filename}.`);
                    parsePDFToText(filename);
                    resolve();
                })
                    .on('error', (error) =>
                    {
                        reject(error);
                    })
    })
        .catch(error =>
        {
            console.log(`Something happened: ${error}.`);
        });
}
