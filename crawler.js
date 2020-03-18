module.exports = { doCrawl }

const fs = require('fs');
const cheerio = require('cheerio');
const request = require('request');
const pdfreader = require("pdfreader");
const pdfParser = require("./pdfConverter");



async function doCrawl()
{
    try
    {
        let links = await getLinkList();
        // console.log(links);
        let linkFile = await getLinkFileFromLinkList(links);
        console.log("Files: " + linkFile.length);
        let saving = await savePDF(linkFile);
        console.log(`Crawling finished. ${saving} changes.\n`);
    }
    catch (err)
    {
        console.log(err);
    }
}


async function getLinkList()
{
    try
    {
        var linkList = [];
        const URL = 'https://sinhvien.bvu.edu.vn';
        const notation = 'Danh mục các học phần được tổ chức giảng dạy E-Learning có lịch học vào ngày';


        let stream = await new Promise((resolve, reject) =>
        {
            request
            ({
                url: URL,
                method: "GET",
                strictSSL: false,
                headers: { "Content-Type": "text/html" }
            },
            function (err, res, body)
            {
                if(err)
                {
                    return reject(err);
                }
                else
                {
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
                                linkList.push(`${date}|${link}`);
                            }
                        }
                    });

                    return resolve(linkList);
                }
            });
        });


        return stream;
    }
    catch (err)
    {
        console.log(err);
    }
}


async function getLinkFileFromLinkList(linkList)
{
    try
    {
        var linkFile = [];
        for (var i = 0; i < linkList.length; ++i)
        {
            const date = linkList[i].split("|")[0];
            const link = linkList[i].split("|")[1];


            let stream = await new Promise((resolve, reject) =>
            {
                request
                ({
                    url: link,
                    method: "GET",
                    strictSSL: false,
                    headers: { "Content-Type": "text/html" }
                },
                function (err, res, body)   //  callback
                {
                    if(err)
                    {
                        reject(err);
                    }
                    else
                    {
                        let $ = cheerio.load(body);  //loading of complete HTML body
                        $('div.body > div#ctl00_ContentPlaceHolder_ContentID').each(function(index)
                        {
                            //  Tìm đường dẫn (thẻ a) đến file PDF trên Website trường
                            const aTag = $(this).find('>p >a');
                            const PDFlink = `https://sinhvien.bvu.edu.vn${aTag.attr('href')}`;
                            resolve({Date: date, Link: PDFlink});
                        });
                    }
                });
            });

            linkFile.push(stream);
        }


        return linkFile;
    }
    catch (err)
    {
        console.log(err);
    }
}


async function savePDF(linkFileList)
{
    try
    {
        let changes = 0;
        for (var i = 0; i < linkFileList.length; ++i)
        {
            //  Thay thế các kí tự xoẹt trong chuỗi ngày tháng (tên file không cho phép kí tự xoẹt)
            let date = linkFileList[i].Date.split('/').join('');

            //  Khai báo đường dẫn đến tên file sẽ lưu
            const filename = `./schedules/${date}/schedule_${date}.pdf`;
            if (fs.existsSync(filename) === true)
            {
                continue;   //  bỏ qua nếu đã tồn tại
            }



            //  Tạo thư mục để lưu nếu chưa tồn tại
            fs.mkdirSync(`./schedules/${date}`, { recursive: true })
            let file = fs.createWriteStream(filename);


            let stream = await new Promise((resolve, reject) =>
            {
                request
                ({
                    uri: linkFileList[i].Link,
                    strictSSL: false
                })
                    .pipe(file) //  lưu file từ URL
                        .on('finish', async () =>
                        {
                            console.log(`Finished downloading: ${filename}.`);
                            let converting = await pdfParser.letConvert(filename);
                            resolve(1);
                        })
                            .on('error', (error) =>
                            {
                                console.log(error);
                                return reject(0);
                            });
            });


            changes += stream;
        }

        return changes;
    }
    catch (err)
    {
        console.log(err);
    }
}
