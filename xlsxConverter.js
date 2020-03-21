module.exports = { download, saveToJSON };



async function toRawJSON(filename)
{
    try
    {
        if (filename.indexOf('xlsx') === -1)
        {
            console.log(`Error at: toRawJSON(): ${filename} not a Excel file.`);
            return;
        }

        const XLSX = require('xlsx');
        const workbook = XLSX.readFile(filename);
        const sheet_name_list = workbook.SheetNames;
        var json = (XLSX.utils.sheet_to_json(workbook.Sheets[sheet_name_list[0]]));
        return json;
    }
    catch (err)
    {
        console.log("Error at: toRawJSON(): " + err);
    }
}

async function replaceJSONKeys(rawJSON)
{
    try
    {
        rawJSON = JSON.stringify(rawJSON);
        let updated = rawJSON.indexOf("__EMPTY_4") !== -1;
        console.log("\nUpdated: " + updated);

        if (!updated)
        {
            rawJSON = rawJSON.replace(/"__EMPTY_1"/gm, "\"Class\"");
            rawJSON = rawJSON.replace(/"__EMPTY_2"/gm, "\"Period\"");
            rawJSON = rawJSON.replace(/"__EMPTY_3"/gm, "\"Teacher\"");
            rawJSON = rawJSON.replace(/"__EMPTY_4"/gm, "\"Notes\"");
            rawJSON = rawJSON.replace(/"__EMPTY_5"/gm, "\"LiveTime\"");
            rawJSON = rawJSON.replace(/"__EMPTY"/gm, "\"Subject\"");
            rawJSON = rawJSON.replace(/"DANH MỤC.*?"/gm, "\"Ordinal\"");
            rawJSON = rawJSON.replace(/\\r\\n/gm, "");
        }
        else    //  For updated PDFs
        {
            rawJSON = rawJSON.replace(/"__EMPTY_1"/gm, "\"Class\"");
            rawJSON = rawJSON.replace(/"__EMPTY_2"/gm, "\"Period\"");
            rawJSON = rawJSON.replace(/"__EMPTY_3"/gm, "\"Teacher\"");
            rawJSON = rawJSON.replace(/"__EMPTY_5"/gm, "\"Notes\"");
            rawJSON = rawJSON.replace(/"__EMPTY_6"/gm, "\"LiveTime\"");
            rawJSON = rawJSON.replace(/"__EMPTY"/gm, "\"Subject\"");
            rawJSON = rawJSON.replace(/"DANH MỤC.*?"/gm, "\"Ordinal\"");
            rawJSON = rawJSON.replace(/\\r\\n/gm, "");
        }

        // console.log(rawJSON);
        rawJSON = JSON.parse(rawJSON);
        return rawJSON;
    }
    catch (err)
    {
        console.log("Error at: replaceJSONKeys(): " + err);
    }
}

async function reformatJSON(json)
{
    try
    {
        let collection = [];
        let departmentCounter = -1;

        for (let i = 0; i < json.length; ++i)
        {
            if (typeof json[i].Ordinal === "number")  //  Số thứ tự của môn học
            {
                let subject =
                {
                    Name: json[i].Subject,
                    Class: json[i].Class,
                    Period: json[i].Period,
                    Teacher: json[i].Teacher,
                    Notes: json[i].Notes || "",
                    LiveTime: json[i].LiveTime  || ""
                }
                
                collection[departmentCounter].Subjects.push(subject);
            }
            else
            {
                let dpIndex;
                let dpName;


                if (json[i].Ordinal.includes("Khoa")) //  Là bắt đầu một Khoa khác
                {
                    dpIndex = json[i].Ordinal.indexOf("Khoa");
                    dpName = json[i].Ordinal.substr(dpIndex);
                    let department = { Department: dpName, Subjects: [] };
                    collection.push(department);
                    ++departmentCounter;
                }
                else
                {
                    if (json[i].Ordinal.includes("Trung tâm Phát triển kỹ năng mềm"))
                    {
                        dpIndex = json[i].Ordinal.indexOf("Trung");
                        dpName = json[i].Ordinal.substr(dpIndex);
                        let department = { Department: dpName, Subjects: [] };
                        collection.push(department);
                        ++departmentCounter;
                    }
                }
            }
        }

        return collection;
    }
    catch (err)
    {
        console.log("Error at: reformatJSON(): " + err);
    }
}

async function saveToJSON(filename)
{
    try
    {
        let rawJSON = await toRawJSON(filename);
        // console.log("Raw: " + JSON.stringify(rawJSON));
        let replaced = await replaceJSONKeys(rawJSON);
        // console.log("Replaced: " + JSON.stringify(replaced));
        let formatted = await reformatJSON(replaced);
        // console.log("Formatted: " + JSON.stringify(formatted));
        
        filename = filename.replace("xlsx", "txt");
        const fs = require("fs");
        fs.writeFileSync(filename, JSON.stringify(formatted));
        return ("Finished convert to: " + filename);
    }
    catch (err)
    {
        console.log(err);
    }
}


async function download(filename)
{
    try
    {
        let stream = await new Promise((resolve, reject) =>
        {
            // https://www.convertapi.com/a
            const fs = require('fs');
            const api = fs.readFileSync('./convertKEY.txt', {encoding: 'utf8'});
            console.log('API key: ' + api);
            const convertapi = require('convertapi')(api,
            {
                conversionTimeout: 60,
                uploadTimeout: 60,
                downloadTimeout: 60
            });
    
    
            convertapi.convert('xlsx', { File: filename })
            .then(result =>
            {
                // get converted file url
                // console.log("Converted file url: " + result.file.url);

                // save to file
                return result.file.save(filename.replace("pdf", "xlsx"));
            })
            .then(filename =>
            {
                return resolve("File saved: " + filename);
            })
            .catch(err =>
            {
                return reject(err);
            });
        });

        return stream;
    }
    catch (err)
    {
        return err;
    }
}
