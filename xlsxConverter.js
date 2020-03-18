module.exports = { saveToJSON };


function toRawJSON(filename)
{
    return new Promise((resolve, reject)=>
    {
        try
        { 
            const XLSX = require('xlsx');
            const workbook = XLSX.readFile('./schedules/19032020/schedule_19032020.xlsx');
            const sheet_name_list = workbook.SheetNames;
            resolve(XLSX.utils.sheet_to_json(workbook.Sheets[sheet_name_list[0]]));
        }
        catch(err)
        {
            reject(err);
        }
    });
}

function replaceJSONKeys(rawJSON)
{
    return new Promise(function(resolve, reject)
    {
        rawJSON = JSON.stringify(rawJSON);
        rawJSON = rawJSON.replace(/"__EMPTY_1"/gm, "\"Class\"");
        rawJSON = rawJSON.replace(/"__EMPTY_2"/gm, "\"Period\"");
        rawJSON = rawJSON.replace(/"__EMPTY_3"/gm, "\"Teacher\"");
        rawJSON = rawJSON.replace(/"__EMPTY_4"/gm, "\"Notes\"");
        rawJSON = rawJSON.replace(/"__EMPTY_5"/gm, "\"LiveTime\"");
        rawJSON = rawJSON.replace(/"__EMPTY"/gm, "\"Subject\"");
        const regex = /"DANH MỤC.*?"/gm;
        rawJSON = rawJSON.replace(regex, "\"Ordinal\"");
        
        resolve(rawJSON);
    });
}

function reformatJSON(json)
{
    return new Promise((resolve, reject)=>
    {
        var collection = [];
        var departmentCounter = -1;
    
        for (var i = 0; i < json.length; ++i)
        {
            if (typeof json[i].Ordinal === "number")  //  Số thứ tự của môn học
            {
                var subject =
                {
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
                var dpIndex;
                var dpName;


                if (json[i].Ordinal.includes("Khoa")) //  Là bắt đầu một Khoa khác
                {
                    dpIndex = json[i].Ordinal.indexOf("Khoa");
                    dpName = json[i].Ordinal.substr(dpIndex);
                    var department = { Department: dpName, Subjects: [] };
                    collection.push(department);
                    ++departmentCounter;
                }
                else
                {
                    if (json[i].Ordinal.includes("Trung tâm Phát triển kỹ năng mềm"))
                    {
                        dpIndex = json[i].Ordinal.indexOf("Trung");
                        dpName = json[i].Ordinal.substr(dpIndex);
                        var department = { Department: dpName, Subjects: [] };
                        collection.push(department);
                        ++departmentCounter;
                    }
                }
            }
        }
    
        resolve(collection);
    });
}



function saveToJSON(filename)
{
    return new Promise((resolve, reject) =>
    {
        toRawJSON(filename)
            .then(rawJSON =>
            {
                return replaceJSONKeys(rawJSON);
            })
                .then(replaced =>
                {
                    return reformatJSON(JSON.parse(replaced));
                })
                   .then(collection =>
                    {
                        filename = filename.replace("xlsx", "txt");
                        const fs = require("fs");
                        fs.writeFileSync(filename, JSON.stringify(collection));
                        console.log("Finished convert to: " + filename);
                        resolve();
                    })
                        .catch(err =>
                        {
                            reject(err);
                        });
    });
}