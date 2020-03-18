module.exports = 
{
    doCrawl, convertToXLS
}

const fs = require('fs');
const cheerio = require('cheerio');
const request = require('request');
const pdfreader = require("pdfreader");
const pdfParser = require("./pdfConverter");


async function parsePDFToText(filename)
{
    try
    {
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
                // var obj = 
                // {
                //     department: "",
                //     subjectname: "",
                //     classname: "",
                //     period: "",
                //     teacher: "",
                //     notes: "",
                //     livetime: ""
                // }
    
    
                //  Ghi file bất đồng bộ
                fs.appendFile(filename.replace("pdf", "txt"), JSON.stringify(item) + '\n', (err)=>
                {
                    if (err)
                        console.log("Error: " + err);
                });
    
                // console.log(item);
                // accumulate text items into rows object, per line
                (rows[item.y] = rows[item.y] || []).push(item.text);
            }
        });
    }
    catch(error)
    {
        Console.log(`Error: ${error}.\n`);
    }
}

        
function printRows(lines, rows, path)
{
    Object.keys(rows) // => array of y-positions (type: float)
        // .sort((y1, y2) => parseFloat(y1) - parseFloat(y2)) // sort float positions
        .forEach(y =>
        {
            // console.log((rows[y] || []).join("|"));
            fs.appendFile(path, (rows[y]) + '\n');
        });
}


async function doCrawl()
{
    try
    {
        const URL = 'https://sinhvien.bvu.edu.vn';
        const notation = 'Danh mục các học phần được tổ chức giảng dạy E-Learning có lịch học vào ngày';
    

        request
        ({
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
    catch (error)
    {
        console.log(`Error: ${error}.\n`);
    }
}


async function getPDFsFromLinkList(linkList)
{
    try
    {
        for (var i = 0; i < linkList.length; ++i)
        {
            const date = linkList[i].split("|")[0];
            const link = linkList[i].split("|")[1];
            
    
            request
            ({
                url: link,
                method: "GET",
                strictSSL: false,
                headers: { "Content-Type": "text/html" }
            },
            function (err, res, body)
            {
                if(err)
                {
                    Console.log("Error occured while hitting URL: " + err);
                }
                else
                {
                    let $ = cheerio.load(body);  //loading of complete HTML body
                    $('div.body > div#ctl00_ContentPlaceHolder_ContentID').each(async function(index)
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
    catch (error)
    {
        Console.log(`Error: ${error}.\n`);
    }
}


async function savePDF(date, url)
{
    try
    {
        if (fs.existsSync(`./schedules/${date}/schedule_${date}.pdf`) === true)
        {
            return;
        }


        //  Thay thế các kí tự xoẹt trong chuỗi ngày tháng (tên file không cho phép kí tự xoẹt)
        date = date.split('/').join('');
    
        //  Khai báo đường dẫn đến tên file sẽ lưu
        const filename = `./schedules/${date}/schedule_${date}.pdf`;
    
        //  Tạo thư mục để lưu nếu chưa tồn tại
        fs.mkdirSync(`./schedules/${date}`, { recursive: true })
        let file = fs.createWriteStream(filename);
    
    
    
        request
        ({
            uri: url,
            strictSSL: false
        })
            .pipe(file) //  lưu file từ URL
            .on('finish', () =>
            {
                console.log(`Finished downloading: ${filename}.`);
                pdfParser.letConvert(filename);
            })
            .on('error', (error) =>
            {
                reject(error);
            })
    }
    catch(error)
    {
        console.log(`Error: ${error}.\n`);
    }
}


async function convertToXLS(filename)
{
    var request = require('request'),
    fs = require('fs'),
    apiKey = '2569bf67731efe0fcf03f63ddfcb2b00becf034e',
    formData = {
        target_format: 'xlsx',
        source_file: fs.createReadStream(filename)
    };

    request.post({url:'https://api.zamzar.com/v1/jobs/', formData: formData},
    function (err, response, body)
    {
        if (err)
        {
            console.error('Unable to start conversion job', err);
        }
        else
        {
            console.log('SUCCESS! Conversion job started:', JSON.parse(body));
        }
    }).auth(apiKey, '', true);
}