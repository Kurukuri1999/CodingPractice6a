const express = require("express");
const app = express();
const path = require("path");
const sqlite3 = require("sqlite3");
const { open } = require("sqlite");
app.use(express.json());
const dbPath = path.join(__dirname, "covid19India.db");
let db = null;

const initializeDBAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("Server Running");
    });
  } catch (e) {
    console.log(`DB error:${e.message}`);
    process.exit(1);
  }
};
initializeDBAndServer();

const convertStateObjectToCamelCase = (obj) => {
  return {
    stateId: obj.state_id,
    stateName: obj.state_name,
    population: obj.population,
  };
};

const convertDistrictObjectToCamelCase = (obj) => {
  return {
    districtId: obj.district_id,
    districtName: obj.district_name,
    stateId: obj.state_id,
    cases: obj.cases,
    cured: obj.cured,
    active: obj.active,
    deaths: obj.deaths,
  };
};

const convertReportToCamelCase = (obj) => {
  return {
    totalCases: obj.cases,
    totalCured: obj.cured,
    totalActive: obj.active,
    totalDeaths: obj.deaths,
  };
};

app.get("/states/", async (request, response) => {
  const allStatesList = `
    select * from state order by state_id;
    `;
  const statesList = await db.all(allStatesList);
  // const statesResult = statesList.map((eachObj) => {
  //  return convertStateObjectToCamelCase(eachObj)
  //});
  response.send(
    statesList.map((eachObj) => convertStateObjectToCamelCase(eachObj))
  );
});

app.get("/states/:stateId/", async (request, response) => {
  const { stateId } = request.params;
  const getState = `
    select * from state where state_id=${stateId};
    `;
  const newState = await db.get(getState);
  //const statesResult = convertStateObjectToCamelCase(newState);
  response.send(convertStateObjectToCamelCase(newState));
});

app.post("/districts/", async (request, response) => {
  const districtDetails = request.body;
  const {
    districtName,
    stateId,
    cases,
    cured,
    active,
    deaths,
  } = districtDetails;
  const newDistrict = `
    insert into district (district_name,state_id,cases,cured,active,deaths)
    values ('${districtName}','${stateId}','${cases}','${cured}','${active}','${deaths}');
    `;
  const addDistrict = await db.run(newDistrict);
  const districtId = addDistrict.lastId;
  response.send("District Successfully Added");
});

app.get("/districts/:districtId/", async (request, response) => {
  const { districtId } = request.params;
  const getDistrict = `
    select * from district where district_id=${districtId};
    `;
  const newDistrict = await db.get(getDistrict);
  //const districtResult = convertDistrictObjectToCamelCase(newDistrict);
  response.send(convertDistrictObjectToCamelCase(newDistrict));
});

app.delete("/districts/:districtId/", async (request, response) => {
  const { districtId } = request.params;
  const deleteDistrict = `
    delete from district where district_id=${districtId};
    `;
  await db.run(deleteDistrict);
  response.send("District Removed");
});

app.put("/districts/:districtId", async (request, response) => {
  const districtDetails = request.body;
  const { districtId } = request.params;
  const {
    districtName,
    stateId,
    cases,
    cured,
    active,
    deaths,
  } = districtDetails;
  const updateDistrict = `
    update district
    set district_name='${districtName}',state_id='${stateId}',
    cases='${cases}',cured='${cured}',active='${active}',
    deaths='${deaths}' where district_id=${districtId};
    `;
  await db.run(updateDistrict);
  response.send("District Details Updated");
});

app.get("/states/:stateId/stats/", async (request, response) => {
  const { stateId } = request.params;
  const getStateReport = `
    select sum(cases) as cases,
    sum(cured) as cured,
    sum(active) as active,
    sum(deaths) as deaths
    from district where state_id=${stateId};
    `;
  const stateReport = await db.get(getStateReport);
  // const resultReport=convertReportToCamelCase(stateReport);
  response.send(convertReportToCamelCase(stateReport));
});

app.get("/districts/:districtId/details/", async (request, response) => {
  const { districtId } = request.params;
  const stateDetails = `
    select state_name from state join district on state.state_id=district.state_id
    where district.district_id=${districtId};
    `;
  const stateName = await db.get(stateDetails);
  response.send({ stateName: stateName.state_name });
});
module.exports = app;
