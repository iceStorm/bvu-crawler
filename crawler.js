module.exports = { doCrawl }

const fs = require('fs');
const cheerio = require('cheerio');
const request = require('request');
const xlsxConverter = require("./xlsxConverter");



async function doCrawl()
{
    try
    {
        let links = await getLinkList();
        let linkFile = await getLinkFileFromLinkList(links);
        console.log(`Files: ${linkFile.length} was found.`);
        let changes = await savePDF(linkFile);
        changes = JSON.parse(JSON.stringify(changes));
        console.log(`Crawling finished. ${changes.length} changes.`);

        
        if (changes.length > 0)
        {
            request
            (
                {
                    method: 'POST',
                    url: 'https://bvu-assistant.herokuapp.com/webhook/new-schedules',
                    json: {changes}
                },
                function(err, res, body)
                {
                    if(err || (res.statusCode != 200))
                    {
                        console.log("Informing to ChatBot failed: " + err);
                    }
                    else
                    {
                        console.log("Successfully inform to ChatBot.");
                    }
                }
            );
        }
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
                                let matching = aTag.attr('title').match(new RegExp(/\d{2}\/\d{2}\/\d{4}/g));
                                const date = matching[0];
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
        let linkFile = [];
        for (let i = 0; i < linkList.length; ++i)
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
        let changes = [];
        for (let i = 0; i < linkFileList.length; ++i)
        {
            //  Thay thế các kí tự xoẹt trong chuỗi ngày tháng (tên file không cho phép kí tự xoẹt)
            let date = linkFileList[i].Date.split('/').join('-');

            //  Khai báo đường dẫn đến tên file sẽ lưu
            const filename = `./schedules/${date}/schedule_${date}.pdf`;
            if (fs.existsSync(filename) === true) { continue; }    //  bỏ qua nếu đã tồn tại tập tin

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
                            console.log(`Finished: ${filename}.`);
                            let converting = await xlsxConverter.download(filename);
                            console.log(converting);
                            setTimeout( async() =>
                            {
                                let saving = await xlsxConverter.saveToJSON(filename.replace("pdf", "xlsx"));
                                console.log(saving);
                                return resolve({Date: date, Link: linkFileList[i].Link});
                            }, 2000);
                        })
                            .on('error', (error) =>
                            {
                                console.log(error);
                                return reject({});
                            });
            });


            // console.log(stream);
            // if (stream.keys(Date).length)
            changes.push(stream);
        }

        return changes;
    }
    catch (err)
    {
        console.log(err);
    }
}
