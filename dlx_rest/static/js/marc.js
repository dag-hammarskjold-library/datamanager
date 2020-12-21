// Class for the component
class MarcRecord extends HTMLElement {

    // invoke the constructor  
    constructor() {

        super();

        // Definition of the id of the component
        this.heigth = "1000px";
        this.width = "1500px";
        this.id = "marc-record";
        this.recordNumber = "";
        this.recordType = "";
        this.myToken = this.getToken();
        this.url = ""
        this.tableNewRecordCreated = false;
        this.displayRecord = false;
        this.rowLineNewRecord = 0;
        //this.prefixUrl = "https://czwkm00smd.execute-api.us-east-1.amazonaws.com/dev/api/";
        this.prefixUrl = this.getPrefix();
        this.editMode = "False";
        this.typeEditMode = "FULLRECORD"
        this.idToUpdate = "";
        this.typeRecordToUpdate = "";
        this.rowselected = 0;
        this.indexRecordToUpdate = "";
        this.tagRecordToUpdate = ""
        this.filesAvailable = [];
        this.leaderList = ['000', '001', '002', '003', '004', '005', '006', '007', '008', '009']
    };

    // create the hidden Modal form
    createhiddenModalForm() {
        this.innerHTML = "<div id='myModal' class='modal' tabindex='-1' role='dialog'> " +
            "        <div class='modal-dialog' role='document'> " +
            "        <div class='modal-content'> " +
            "            <div class='modal-header'> " +
            "            <div id='modalTitle' class='modal-title'> myTitle </div> " +
            "            <button type='button' class='close' data-dismiss='modal' aria-label='Close'> " +
            "                <span aria-hidden='true'>&times;</span> " +
            "            </button> " +
            "            </div> " +
            "            <div class='modal-body'> " +
            "            <div id='modalContent'>  myContent  </div> " +
            "            </div> " +
            "            <div class='modal-footer'> " +
            "            <button id='modalClose' type='button' class='btn btn-secondary' data-dismiss='modal'>Close</button> " +
            "            <button id='modalButton' type='button' class='btn btn-primary'> myButtonLabel  </button> " +
            "            </div>" +
            "        </div>" +
            "        </div>" +
            "        </div> ";
    }

    // function fetching the data from the API
    async getDataFromApi(value) {
        this.url = this.prefixUrl + value;
        let response = await fetch(this.url);
        if (response.ok) { 
            
            let json = await response.json();
            let resultsList = Object.keys(json["result"]);

            // check if the files are available
            if (Object.keys(json["files"])) {
                this.filesAvailable = json["files"]
            }

            let resultsSize = resultsList.length;
            let results = json["result"];
            divMailHeader.innerHTML = "";
            this.displayRecord = true
            this.typeEditMode = "INIT"
            this.manageDisplayButton();
            this.displayDataFromApi(resultsList, resultsSize, results);
        } else {
            return divMailHeader.innerHTML = "<div class='alert alert-danger mt-2 alert-dismissible fade show' role='alert'>Something is wrong, HTTP-Error number : " + response.status + "</div>";
        }
    }

    // call the API for deletion
    async deleteDataFromApi(recordType, recordID) {

        let myString = this.prefixUrl + recordType + '/' + recordID;
        let username = "admin@un.org";
        let password = "qitqiv-1sonmy-rAnwov";
        let encodedString = window.btoa(username + ":" + password);
        let auth = "Basic " + encodedString;

        fetch(myString, {
            method: 'DELETE',
            headers: new Headers({
                'Accept': 'application/json',
                "Authorization": auth
            })
        })
        .then(response => {
            if (response.ok) {
                divMailHeader.innerHTML = "<div class='alert alert-success mt-2 alert-dismissible fade show' role='alert'>Record deleted!</div>";
              }

            if(!response.ok){
                response.json()
                    .then(json => {
                        divMailHeader.innerHTML = "<div class='alert alert-danger mt-2 alert-dismissible fade show' role='alert'>Something is wrong: " + json.message + "</div>";
                    });
            }
        })
        .catch(error =>{
            divMailHeader.innerHTML = "<div class='alert alert-danger mt-2 alert-dismissible fade show' role='alert'>Something is wrong: " + error.message + "</div>";
        })

        this.typeEditMode='INIT';
        this.manageDisplayButton(); 
    }

    // call the API for creation
    async createRecord(url, data) {
        //async createRecord(url){

        let username = "admin@un.org";
        let password = "qitqiv-1sonmy-rAnwov";
        let encodedString = window.btoa(username + ":" + password);
        let auth = "Basic " + encodedString;

        fetch(url, {
            method: 'POST',
            headers: new Headers({
                "Content-Type": "application/json",
                "Authorization": auth
            }),
            body: data
        })        
        .then(response => {
            if (response.ok) {
                divMailHeader.innerHTML = "<div class='alert alert-success mt-2 alert-dismissible fade show' role='alert'>Record created!</div>";
              }
            if(!response.ok){
                response.json()
                    .then(json => {
                        divMailHeader.innerHTML = "<div class='alert alert-danger mt-2 alert-dismissible fade show' role='alert'>Something is wrong : " + json.message + "</div>";
                    });
            }
        })
        .catch(error =>{
            divMailHeader.innerHTML = "<div class='alert alert-danger mt-2 alert-dismissible fade show' role='alert'>Something is wrong : " + error.message + "</div>";
        })

        this.typeEditMode='CREATERECORD';
        this.manageDisplayButton(); 
    }

    async cloneRecord(url, data) {
        //async createRecord(url){

        let username = "admin@un.org";
        let password = "qitqiv-1sonmy-rAnwov";
        let encodedString = window.btoa(username + ":" + password);
        let auth = "Basic " + encodedString;

        fetch(url, {
            method: 'POST',
            headers: new Headers({
                "Content-Type": "application/json",
                "Authorization": auth
            }),
            body: data
        })        
        .then(response => {
            if (response.ok) {
                divMailHeader.innerHTML = "<div class='alert alert-success mt-2 alert-dismissible fade show' role='alert'>Record cloned!</div>";
              }
            if(!response.ok){
                response.json()
                    .then(json => {
                        divMailHeader.innerHTML = "<div class='alert alert-danger mt-2 alert-dismissible fade show' role='alert'>Something is wrong : " + json.message + "</div>";
                    });
            }
        })
        .catch(error =>{
            divMailHeader.innerHTML = "<div class='alert alert-danger mt-2 alert-dismissible fade show' role='alert'>Something is wrong : " + error.message + "</div>";
        })

        this.typeEditMode='CREATERECORD';
        this.manageDisplayButton(); 
    }

    // update at the record level
    async updateFullRecord(url, data) {
        //async createRecord(url){

        let username = "admin@un.org";
        let password = "qitqiv-1sonmy-rAnwov";
        let encodedString = window.btoa(username + ":" + password);
        let auth = "Basic " + encodedString;

        fetch(url, {
            method: 'PUT',
            headers: new Headers({
                "Content-Type": "application/json",
                "Authorization": auth
            }),
            body: data
        })        
        .then(response => {
            if (response.ok) {
                divMailHeader.innerHTML = "<div class='alert alert-success mt-2 alert-dismissible fade show' role='alert'>Full Record updated!</div>";
              }
            if(!response.ok){
                response.json()
                    .then(json => {
                        divMailHeader.innerHTML = "<div class='alert alert-danger mt-2 alert-dismissible fade show' role='alert'>Something is wrong : " + json.message + "</div>";
                    });
            }
        })
        .catch(error =>{
            divMailHeader.innerHTML = "<div class='alert alert-danger mt-2 alert-dismissible fade show' role='alert'>Something is wrong : " + error.message + "</div>";
        })

        this.typeEditMode='FULLRECORD';
        this.manageDisplayButton(); 
    }


    // update at the tag level
    async updateTagRecord(url, data) {

        let username = "admin@un.org";
        let password = "qitqiv-1sonmy-rAnwov";
        let encodedString = window.btoa(username + ":" + password);
        let auth = "Basic " + encodedString;

        fetch(url, {
            method: 'PUT',
            headers: new Headers({
                "Content-Type": "application/json",
                "Authorization": auth
            }),
            body: data
        })
        .then(response => {
            if (response.ok) {
                this.typeEditMode='TAGRECORD';
                this.manageDisplayButton(); 
                this.indexRecord="";
                divMailHeader.innerHTML = "<div class='alert alert-success mt-2 alert-dismissible fade show' role='alert'>Record updated at the TAG level!</div>";
            }
            if(!response.ok){
                response.json()
                    .then(json => {
                        this.typeEditMode='TAGRECORD';
                        this.manageDisplayButton(); 
                        this.indexRecord="";
                        divMailHeader.innerHTML = "<div class='alert alert-danger mt-2 alert-dismissible fade show' role='alert'>Something is wrong: " + json.message + "</div>";
                    });
            }
        })
        .catch(error =>{
            this.typeEditMode='TAGRECORD';
            this.manageDisplayButton(); 
            this.indexRecord="";
            divMailHeader.innerHTML = "<div class='alert alert-danger mt-2 alert-dismissible fade show' role='alert'>Something is wrong: " + error.message + "</div>";
        })


    }

    // remove a div from the page
    removeDiv(name) {
        this.removeChild(name);
    }

    manageDisplayButton() {
        if (this.typeEditMode === 'INIT') {
            if (document.getElementById("btnAddingNewLine")) document.getElementById("btnAddingNewLine").style.display = 'none';
            if (document.getElementById("btnDeletingNewLine")) document.getElementById("btnDeletingNewLine").style.display = 'none';
            if (document.getElementById("btnAddNewSubField")) document.getElementById("btnAddNewSubField").style.display = 'none';
            if (document.getElementById("btnDelNewSubField")) document.getElementById("btnDelNewSubField").style.display = 'none';
            if (document.getElementById("btnSaveRecord")) document.getElementById("btnSaveRecord").style.display = 'none';
            if (document.getElementById("btnCreateNewRecord")) document.getElementById("btnCreateNewRecord").style.display = 'inline';
            if (document.getElementById("btnCloneRecord")) document.getElementById("btnCloneRecord").style.display = 'none';
            if (document.getElementById("btnEditRecord")) document.getElementById("btnEditRecord").style.display = 'inline';
            if (document.getElementById("btnUpdateRecord")) document.getElementById("btnUpdateRecord").style.display = 'none';
            if (document.getElementById("divRecordType")) document.getElementById("divRecordType").style.display = 'none';

        }

        if (this.typeEditMode === 'TAGRECORD') {
            if (document.getElementById("btnAddingNewLine"))document.getElementById("btnAddingNewLine").style.display = 'none';
            if (document.getElementById("btnDeletingNewLine"))document.getElementById("btnDeletingNewLine").style.display = 'none';
            if (document.getElementById("btnAddNewSubField"))document.getElementById("btnAddNewSubField").style.display = 'inline';
            if (document.getElementById("btnDelNewSubField"))document.getElementById("btnDelNewSubField").style.display = 'inline';
            if (document.getElementById("btnSaveRecord"))document.getElementById("btnSaveRecord").style.display = 'none';
            if (document.getElementById("btnCreateNewRecord"))document.getElementById("btnCreateNewRecord").style.display = 'none';
            if (document.getElementById("btnCloneRecord"))document.getElementById("btnCloneRecord").style.display = 'none';
            if (document.getElementById("btnEditRecord"))document.getElementById("btnEditRecord").style.display = 'none';
            if (document.getElementById("btnUpdateRecord"))document.getElementById("btnUpdateRecord").style.display = 'inline';
        }

        if (this.typeEditMode === 'FULLRECORD') {
            if (document.getElementById("btnAddingNewLine"))document.getElementById("btnAddingNewLine").style.display = 'inline';
            if (document.getElementById("btnDeletingNewLine"))document.getElementById("btnDeletingNewLine").style.display = 'inline';
            if (document.getElementById("btnAddNewSubField"))document.getElementById("btnAddNewSubField").style.display = 'inline';
            if (document.getElementById("btnDelNewSubField"))document.getElementById("btnDelNewSubField").style.display = 'inline';
            if (document.getElementById("btnSaveRecord"))document.getElementById("btnSaveRecord").style.display = 'none';
            if (document.getElementById("btnCreateNewRecord"))document.getElementById("btnCreateNewRecord").style.display = 'none';
            if (document.getElementById("btnCloneRecord"))document.getElementById("btnCloneRecord").style.display = 'inline';
            if (document.getElementById("btnEditRecord"))document.getElementById("btnEditRecord").style.display = 'none';
            if (document.getElementById("btnUpdateRecord"))document.getElementById("btnUpdateRecord").style.display = 'inline';
            if (document.getElementById("divDetail")) document.getElementById("divDetail").style.display = 'inline';
        }

        if (this.typeEditMode === 'CREATERECORD') {
            if (document.getElementById("btnAddingNewLine"))document.getElementById("btnAddingNewLine").style.display = 'inline';
            if (document.getElementById("btnDeletingNewLine"))document.getElementById("btnDeletingNewLine").style.display = 'inline';
            if (document.getElementById("btnAddNewSubField"))document.getElementById("btnAddNewSubField").style.display = 'inline';
            if (document.getElementById("btnDelNewSubField"))document.getElementById("btnDelNewSubField").style.display = 'inline';
            if (document.getElementById("btnSaveRecord"))document.getElementById("btnSaveRecord").style.display = 'inline';
            if (document.getElementById("btnCreateNewRecord"))document.getElementById("btnCreateNewRecord").style.display = 'none';
            if (document.getElementById("btnCloneRecord"))document.getElementById("btnCloneRecord").style.display = 'none';
            if (document.getElementById("btnEditRecord"))document.getElementById("btnEditRecord").style.display = 'none';
            if (document.getElementById("btnUpdateRecord"))document.getElementById("btnUpdateRecord").style.display = 'none';
            if (document.getElementById("divDetail")) document.getElementById("divDetail").style.display = 'none';
            if (document.getElementById("divRecordType"))document.getElementById("divRecordType").style.display = 'inline';
        }
    }

    // create the record form
    createFrameNewRecord() {

        this.tableNewRecordCreated = true;

        //--->create data table > start
        var tbl = '';
        //table-responsive table-sm
        tbl += '<table id="tableNewRecord" class="table table-hover table-responsive">'

        //--->create table header > start
        tbl += '<thead>';
        tbl += '<tr>';
        tbl += '<th><span class="badge badge-secondary">#</span></th>';
        tbl += '<th><span class="badge badge-secondary">TAG</span></th>';
        tbl += '<th><span class="badge badge-secondary">IND1 </span></th>';
        tbl += '<th><span class="badge badge-secondary">IND2 </span></th>';
        tbl += '<th><span class="badge badge-secondary">VALUE</span></th>';
        tbl += '<th><span class="badge badge-secondary">XREF</span></th>';
        tbl += '</tr>';
        tbl += '</thead>';


        // Create a new line in the table

        tbl += '<tbody id=tbodyNewLine>'

        this.rowLineNewRecord++;
        let row_id = this.rowLineNewRecord;

        // creation of the header of the table

        tbl += '<tr id="' + row_id + '">';
        tbl += '<td><div style="display: table;" class="tagClass mt-0" col_name="tagCol" contenteditable="true"> <input class="myCheckbox" id="checkboxCol' + row_id + '" type="checkbox" placeholder="Tag" maxlength="3" size="3"></div></td>';
        tbl += '<td><div style="display: table;" class="tagClass mt-0" col_name="tagCol" contenteditable="true"> <input id="tagCol' + row_id + '" type="text"  min="000" max="999" placeholder="Tag" maxlength="3" size="3"></div></td>';
        tbl += '<td><div style="display: table;" class="indClass" col_name="ind1Col" contenteditable="true"><select class="mt-1" id="ind1Col' + row_id + '"><option value=" "> </option><option value="N/A">N/A</option> <option value="0">0</option> <option value="1">1</option> <option value="2">2</option> <option value="3">3</option> <option value="4">4</option> <option value="5">5</option> <option value="6">6</option> <option value="7">7</option> <option value="8">8</option><option value="9">9</option></select></div></td>';
        tbl += '<td><div style="display: table;" class="indClass" col_name="ind2Col" contenteditable="true"><select class="mt-1" id="ind2Col' + row_id + '"><option value=" "> </option><option value="N/A">N/A</option> <option value="0">0</option> <option value="1">1</option> <option value="2">2</option> <option value="3">3</option> <option value="4">4</option> <option value="5">5</option> <option value="6">6</option> <option value="7">7</option> <option value="8">8</option><option value="9">9</option></select></div></td>';
        tbl += '<td><div id="divData' + row_id + '" style="display: table;" class="valueClass" col_name="valueCol" contenteditable="true"><div><select class="mr-2" id="code' + row_id + '"><option value=" "> </option><option value="N/A">N/A</option> <option value="a">a</option> <option value="b">b</option> <option value="c">c</option> <option value="d">d</option> <option value="e">e</option> <option value="f">f</option> <option value="g">g</option> <option value="h">h</option> <option value="i">i</option> <option value="j">j</option> <option value="k">k</option> <option value="l">l</option> <option value="m">m</option> <option value="n">n</option> <option value="o">o</option> <option value="p">p</option> <option value="q">q</option> <option value="r">r</option> <option value="s">s</option> <option value="t">t</option> <option value="u">u</option> <option value="v">v</option><option value="w">w</option> <option value="x">x</option> <option value="y">y</option><option value="z">z</option><option value="0">0</option><option value="1">1</option><option value="2">2</option><option value="3">3</option><option value="4">4</option><option value="5">5</option><option value="6">6</option><option value="7">7</option><option value="8">8</option><option value="9">9</option></select><input size="25" id="value' + row_id + '" type="text" placeholder="Value"></div></div></td>';
        tbl += '<td><div id="divXref' + row_id + '" ><div><input size="8" id="inputXref' + row_id + '" type="text" placeholder="xref"></div></div></td>';

        // end of the line

        tbl += '</tr>';

        // end of the body of the table

        tbl += '</tbody>';

        // end of the table

        tbl += '</table>'

        // Adding the HR line

        tbl += '<hr>'

        // Adding a div with the number of line created for the record
        tbl += "<div ><span id='valNumLineNewRecord' >" + this.rowLineNewRecord + "</span> Tag(s) created for this record </div>"

        // check if the div content is already created 

        let divContent = document.getElementById("divContent");
        if (divContent !== null) {
            //this.removeDiv(divContent);
            divContent.innerHTML = " ";
        }

        // check if the div newRecord is already created 
        let divNewRecord = document.getElementById("divNewRecord");

        if (divNewRecord !== null) {
            divNewRecord.innerHTML = " ";
            //this.removeDiv(divNewRecord);
        }

        // create the div for the data
        if (divNewRecord === null) {
            divNewRecord = document.createElement("DIV");
            divNewRecord.id = "divNewRecord";
        }

        this.manageDisplayButton();

        //divNewRecord.appendChild(table);

        divNewRecord.innerHTML = tbl;
        this.appendChild(divNewRecord);
    }
    setModalWindos(myClass, myTitle, MyContent, myBtnLbl) {
        document.getElementById("modalTitle").innerHTML = `<div class='"+${myClass}+"' role='alert'> "+${myTitle}+"</div>`;
        document.getElementById("modalContent").innerHTML = `<div class='form-group'><label for='modalUrl'>"+${myBtnLbl}+"</label><input type='text' class='form-control' id='modalUrl'></div>`;
        let myButtonHeader = document.getElementById("modalButton");
        myButtonHeader.innerHTML = `${myBtnLbl}`;
    };

    addNewLineRecord(row_id) {

        if (this.tableNewRecordCreated == true) {
            this.rowLineNewRecord++;
            let row_id = this.rowLineNewRecord;
            const myTable = document.getElementById("tableNewRecord");
            let NewRow = myTable.insertRow(-1);
            NewRow.id = row_id;
            let cell0 = NewRow.insertCell(0);
            let cell1 = NewRow.insertCell(1);
            let cell2 = NewRow.insertCell(2);
            let cell3 = NewRow.insertCell(3);
            let cell4 = NewRow.insertCell(4);
            let cell5 = NewRow.insertCell(5);
            cell0.innerHTML = '<div style="display: table;" class="tagClass mt-0" col_name="tagCol" contenteditable="true"> <input class="myCheckbox" id="checkboxCol' + row_id + '" type="checkbox" placeholder="Tag" maxlength="3" size="3"></div>';
            cell1.innerHTML = '<div style="display: table;" class="tagClass mt-0" col_name="tagCol" contenteditable="true"> <input id="tagCol' + row_id + '" type="text" min="001" max="999" placeholder="Tag" maxlength="3" size="3"></div>';
            cell2.innerHTML = '<div style="display: table;" class="indClass" col_name="ind1Col" contenteditable="true"><select class="mt-1" id="ind1Col' + row_id + '"><option value=" "> </option><option value="N/A">N/A</option> <option value="0">0</option> <option value="1">1</option> <option value="2">2</option> <option value="3">3</option> <option value="4">4</option> <option value="5">5</option> <option value="6">6</option> <option value="7">7</option> <option value="8">8</option><option value="9">9</option></select></div>';
            cell3.innerHTML = '<div style="display: table;" class="indClass" col_name="ind2Col" contenteditable="true"><select class="mt-1" id="ind2Col' + row_id + '"><option value=" "> </option><option value="N/A">N/A</option> <option value="0">0</option> <option value="1">1</option> <option value="2">2</option> <option value="3">3</option> <option value="4">4</option> <option value="5">5</option> <option value="6">6</option> <option value="7">7</option> <option value="8">8</option><option value="9">9</option></select></div>';
            cell4.innerHTML = '<div id="divData' + row_id + '" style="display: table;" class="valueClass" col_name="valueCol" contenteditable="true"><div><select class="mr-2" id="code' + row_id + '"><option value=" "> </option><option value="N/A">N/A</option><option value="a">a</option> <option value="b">b</option> <option value="c">c</option> <option value="d">d</option> <option value="e">e</option> <option value="f">f</option> <option value="g">g</option> <option value="h">h</option> <option value="i">i</option> <option value="j">j</option> <option value="k">k</option> <option value="l">l</option> <option value="m">m</option> <option value="n">n</option> <option value="o">o</option> <option value="p">p</option> <option value="q">q</option> <option value="r">r</option> <option value="s">s</option> <option value="t">t</option> <option value="u">u</option> <option value="v">v</option><option value="w">w</option> <option value="x">x</option> <option value="y">y</option><option value="z">z</option><option value="0">0</option><option value="1">1</option><option value="2">2</option><option value="3">3</option><option value="4">4</option><option value="5">5</option><option value="6">6</option><option value="7">7</option><option value="8">8</option><option value="9">9</option></select><input size="25" id="value' + row_id + '" type="text" placeholder="Value"></div></div>';
            cell5.innerHTML = '<div id="divXref' + row_id + '" ><div><input size="8" id="inputXref' + row_id + '" type="text" placeholder="xref"></div></div>';
            this.updateNumberOfLineRecord();
        } else {
            alert("Please create a new record first!!!");
        }


    }

    removeLastLineRecord() {
        if (this.tableNewRecordCreated == true && (this.rowLineNewRecord > 1)) {
            const myTable = document.getElementById("tableNewRecord")
            myTable.deleteRow(-1);
            this.rowLineNewRecord = this.rowLineNewRecord - 1;
            this.updateNumberOfLineRecord();
        } else {
            alert("Impossible to remove this line!!!");
        }
    }

    // Add a new subfieldLine
    addNewSubFieldLine() {
        if (this.tableNewRecordCreated == true || this.editMode === "True") {
            let checkButton = false;

            // Retrieving the table
            const myTable = document.getElementById("tableNewRecord");

            // Retrieving all the checkbox
            const myCheckbox = myTable.getElementsByClassName("myCheckbox");

            //Loop through the CheckBoxes.
            for (var i = 0; i < myCheckbox.length; i++) {
                if (myCheckbox[i].checked) {
                    checkButton = true;
                    let row = myCheckbox[i].parentNode.parentNode.parentNode;
                    
                    let myId = "divData" + row.rowIndex;
                    let myTd = document.getElementById(myId);
                    myTd.insertAdjacentHTML('beforeend', '<div><select class="mr-2"><option value=" "> </option><option value=" "> </option><option value="N/A">N/A</option><option value="a">a</option> <option value="b">b</option> <option value="c">c</option> <option value="d">d</option> <option value="e">e</option> <option value="f">f</option> <option value="g">g</option> <option value="h">h</option> <option value="i">i</option> <option value="j">j</option> <option value="k">k</option> <option value="l">l</option> <option value="m">m</option> <option value="n">n</option> <option value="o">o</option> <option value="p">p</option> <option value="q">q</option> <option value="r">r</option> <option value="s">s</option> <option value="t">t</option> <option value="u">u</option> <option value="v">v</option><option value="w">w</option> <option value="x">x</option> <option value="y">y</option><option value="z">z</option><option value="0">0</option><option value="1">1</option><option value="2">2</option><option value="3">3</option><option value="4">4</option><option value="5">5</option><option value="6">6</option><option value="7">7</option><option value="8">8</option><option value="9">9</option><option value="xref">xref</option></select><input size="25" type="text" placeholder="Value"></div>');

                    // Management of the xref
                    let myXref="divXref" + row.rowIndex;
                    let myTdXref=document.getElementById(myXref);
                    myTdXref.insertAdjacentHTML('beforeend', '<div><input size="8" type="text" placeholder="xref"></div>');

                }
            }
            if (checkButton == false) {
                divMailHeader.innerHTML ="<div class='alert alert-danger mt-2 alert-dismissible fade show' role='alert'>Please check a tag first!!!</div>";
            }
        } else {
            divMailHeader.innerHTML ="<div class='alert alert-danger mt-2 alert-dismissible fade show' role='alert'>Please create a new the record first or Edit an old record!!!</div>";
        }
    }

    // Remove a new subfieldLine
    delNewSubFieldLine() {
        if (this.tableNewRecordCreated == true) {
            // Retrieving the table
            const myTable = document.getElementById("tableNewRecord");

            // Retrieving all the checkbox
            const myCheckbox = myTable.getElementsByClassName("myCheckbox");

            //Loop through the CheckBoxes.
            for (var i = 0; i < myCheckbox.length; i++) {

                if (myCheckbox[i].checked) {
                    let row = myCheckbox[i].parentNode.parentNode.parentNode;
                    let myId = "divData" + row.rowIndex;
                    let myIdXref= "divXref" + row.rowIndex;
                    let myTd = document.getElementById(myId);
                    let myTdXref = document.getElementById(myIdXref);

                    if (myTd.childElementCount > 1) {
                        myTd.removeChild(myTd.lastElementChild);
                    }else {
                        divMailHeader.innerHTML ="<div class='alert alert-danger mt-2 alert-dismissible fade show' role='alert'>Impossible to remove this line!!!</div>";
                    }
                    if (myTdXref.childElementCount > 1) {
                        myTdXref.removeChild(myTdXref.lastElementChild);
                    }else {
                        divMailHeader.innerHTML ="<div class='alert alert-danger mt-2 alert-dismissible fade show' role='alert'>Impossible to remove this line!!!</div>"
                    }
                }
            }
        }
    }


    // Retrieving the table
    generateDataToSave() {

        // my data variable
        let myRecord = [];
        let mySpecialRecord = "{";
        //let myTagLine={};
        let myTag = []
        let myInd1 = []
        let myInd2 = []
        let myListOfSubField = "[";
        let myData = "";
        let recup = "";
        let myLeader = "";

        // Retrieving the table
        const myTable = document.getElementById("tableNewRecord");

        // Retrieving all the rows
        const totalRow = myTable.getElementsByTagName("TR");
        // console.log(totalRow)

        // Loop for the leaders fields
        for (var i = 1, row; row = myTable.rows[i]; i++) {

            // Retrieving tag data
            myTag = document.getElementById("tagCol" + i).value;

            if (this.leaderList.indexOf(myTag) !== -1) {

                if (myLeader === "") {
                    myLeader = `"${myTag}":["${document.getElementById("divData" + i).getElementsByTagName("DIV")[0].getElementsByTagName("INPUT")[0].value}"]`;
                } else {
                    myLeader = myLeader + "," + `"${myTag}":["${document.getElementById("divData" + i).getElementsByTagName("DIV")[0].getElementsByTagName("INPUT")[0].value}"]`;
                }
            }
        }

        // Adding the leaders fields to my special record
        if (myLeader !== "") {
            mySpecialRecord = mySpecialRecord + myLeader + ",";
        }

        for (var i = 1, row; row = myTable.rows[i]; i++) {


            // Retrieving tag data
            myTag = document.getElementById("tagCol" + i).value;

            //
            if (this.leaderList.indexOf(myTag) === -1) {

                // Retrieving ind1 data
                if (document.getElementById("ind1Col" + i).value) {
                    myInd1 = document.getElementById("ind1Col" + i).value
                } else {
                    myInd1 = " "
                };

                // Retrieving ind2 data
                if (document.getElementById("ind2Col" + i).value) {
                    myInd2 = document.getElementById("ind2Col" + i).value
                } else {
                    myInd2 = " "
                };

                // Retrieving Subfield data
                let myData = document.getElementById("divData" + i).getElementsByTagName("DIV");

                let lenMyData = myData.length;

                let mySubField = "";

                for (var j = 0; j < lenMyData; j++) {
                    let myCode = myData[j].getElementsByTagName("SELECT")[0].value;
                    //console.log("le code est  :" + myCode)

                    let myValue = myData[j].getElementsByTagName("INPUT")[0].value;
                    //console.log("la valeur est  :" + myValue)


                    // Definition of the dict to store the subfields
                    if (j === (lenMyData - 1)) {
                        //myListOfSubField = myListOfSubField +`{"code": "${myCode}","value": "${myValue}"}` ;
                        myListOfSubField = myListOfSubField + `{"code": "${myCode}","value": "${myValue}"}`;
                    } else {
                        myListOfSubField = myListOfSubField + `{"code": "${myCode}","value": "${myValue}"}` + ",";
                    }

                }

                // close the subfield string
                myListOfSubField = myListOfSubField + "]";
                //console.log(myListOfSubField)

                if (i === (totalRow.length - 1)) {
                    mySpecialRecord = mySpecialRecord + `"${myTag}":[{"indicators":["${myInd1}","${myInd2}"],"subfields": ${myListOfSubField}` + "}]}";
                } else {
                    mySpecialRecord = mySpecialRecord + `"${myTag}":[{"indicators":["${myInd1}","${myInd2}"],"subfields": ${myListOfSubField}` + "}],";
                }

                myListOfSubField = "[";
            }

        }

        // Retrieving the value of the type of Record
        let typeRecord = ""
        if (this.typeEditMode === "CREATERECORD") {
            typeRecord = document.getElementById("selectTypeRecord").value;
        } else {
            typeRecord = this.typeRecordToUpdate;
        }

        // Saving the Data
        let data = mySpecialRecord;

        console.log(data);

        alert(data)

        // Call the method to create the record
        this.createRecord(this.prefixUrl + typeRecord, data)

        // Restauring the init edit mode
        this.typeEditMode = "INIT"

    }

    // Update at the Full Record level
    generateDataFullRecordToUpdateNewVersion(type) {

        console.log(type)
        // Retrieving the value of the type of Record
        let typeRecord = this.typeRecordToUpdate;

        let myInd1 = ""
        let myInd2 = ""
        let myLeaderField = []
        let myNormalField = []

        // Objects definition

        let subfields = [] // array of subfields
        let indicators = [] // array of indicators

        let tagRecord = [] // all the contains for the tag
        let marcRecords = {} // List of marc records

        // Retrieving the id
        if (type === 1) {
            marcRecords["_id"] = this.idToUpdate;
        }

        // Retrieving the table
        const myTable = document.getElementById("tableNewRecord");

        // Loop for the leaders fields
        for (var i = 1, row; row = myTable.rows[i]; i++) {

            // Retrieving the leader data
            // Here we will just fill the tagRecord with the value of the divData 
            if (this.leaderList.indexOf(document.getElementById("tagCol" + i).value) !== -1) {

                // Retrieving the data of the leader field
                tagRecord.push(document.getElementById("divData" + i).getElementsByTagName("DIV")[0].getElementsByTagName("INPUT")[0].value);

                // Case where the tag is already in the list, we should add a new value to this array
                if (myLeaderField.indexOf(document.getElementById("tagCol" + i).value) !== -1) {
                    marcRecords[document.getElementById("tagCol" + i).value] = recup.push(tagRecord);
                }

                // Case where the tag is not in the list
                if (myLeaderField.indexOf(document.getElementById("tagCol" + i).value) === -1) {

                    // Inserting the value of this tag in the marcRecord
                    marcRecords[document.getElementById("tagCol" + i).value] = tagRecord

                    // Insert the tag in the list of tag already processed
                    myLeaderField.push(document.getElementById("tagCol" + i).value)
                }

                // Cleaning the tagRecord
                tagRecord = []

            }
            // Extracting the "normal" fields 
            else {

                // step 1
                // Retriving the indicators
                // Retrieving ind1 data
                if (document.getElementById("ind1Col" + i).value) {
                    myInd1 = document.getElementById("ind1Col" + i).value
                } else {
                    myInd1 = " "
                };

                // Retrieving ind2 data
                if (document.getElementById("ind2Col" + i).value) {
                    myInd2 = document.getElementById("ind2Col" + i).value
                } else {
                    myInd2 = " "
                };

                // Inserting the values in the indicator array
                indicators.push(myInd1, myInd2)

                // Step2
                // Inserting the subfields

                let myData = document.getElementById("divData" + i).getElementsByTagName("DIV");

                // Retrieving xref data
                let myXrefData = document.getElementById("divXref" + i).getElementsByTagName("INPUT");

                let lenMyData = myData.length;

                for (var j = 0; j < lenMyData; j++) {
                    let subfield = new Object() // subfields with code and values

                    // Retrieving the code 
                    subfield["code"] = myData[j].getElementsByTagName("SELECT")[0].value;

                    // Retrieving the value
                    subfield["value"] = myData[j].getElementsByTagName("INPUT")[0].value.trimEnd();

                    if (myXrefData[j].value){
                        subfield["xref"] = parseInt(myXrefData[j].value);
                    }

                    // Inserting the value in the subfields arrays
                    subfields.push(subfield);
                }

                // Inserting the values
                let values = new Object() // dictionnary with indicators and subfields
                values["indicators"] = indicators
                values["subfields"] = subfields

                // Inserting the values in tagRecord
                tagRecord.push(values)

                // Case where the tag is not in the list
                if (myNormalField.indexOf(document.getElementById("tagCol" + i).value) === -1) {
                    // Inserting the values in tagRecord
                    marcRecords[document.getElementById("tagCol" + i).value] = tagRecord
                } else {
                    // Inserting the values in tagRecord
                    marcRecords[document.getElementById("tagCol" + i).value] = marcRecords[document.getElementById("tagCol" + i).value].concat(tagRecord)
                }

                // Cleaning 
                indicators = []
                subfields = []
                tagRecord = []

                // Inserting this tag in the list of tags already loaded
                myNormalField.push(document.getElementById("tagCol" + i).value)

            }
        }

        // Build the json syntax    
        let data = JSON.stringify(marcRecords);

        // Display the json generated
        console.log(data)

        // update
        if (type === 1) {
            //  update the Data
            this.updateFullRecord(this.prefixUrl + typeRecord + "/" + this.idToUpdate, data);
        } 
        
        // create
        if (type === 0) { 
            //  save the data
            typeRecord = document.getElementById("selectTypeRecord").value;
            this.createRecord(this.prefixUrl + typeRecord, data)
        }

        // clone
        if (type === 2) { 
            //  save the data
            typeRecord = this.recordType ;
            this.cloneRecord(this.prefixUrl + typeRecord, data)
        }
    }

    // Update at the Full Record level
    generateDataFullRecordToUpdate() {

        // my data variable
        let myRecord = [];
        let mySpecialRecord = '{"_id": ' + this.idToUpdate + ', ';
        //let myTagLine={};
        let myTag = []
        let myInd1 = []
        let myInd2 = []
        let myListOfSubField = "[";
        let myData = "";
        let recup = "";
        let myLeader = "";

        // Retrieving the table
        const myTable = document.getElementById("tableNewRecord");

        // Retrieving all the rows
        const totalRow = myTable.getElementsByTagName("TR");
        // console.log(totalRow)

        // Loop for the leaders fields
        for (var i = 1, row; row = myTable.rows[i]; i++) {

            // Retrieving tag data
            myTag = document.getElementById("tagCol" + i).value;

            if (this.leaderList.indexOf(myTag) !== -1) {

                if (myLeader === "") {
                    myLeader = `"${myTag}":["${document.getElementById("divData" + i).getElementsByTagName("DIV")[0].getElementsByTagName("INPUT")[0].value}"]`;
                } else {
                    myLeader = myLeader + "," + `"${myTag}":["${document.getElementById("divData" + i).getElementsByTagName("DIV")[0].getElementsByTagName("INPUT")[0].value}"]`;
                }
            }
        }

        // Adding the leaders fields to my special record
        if (myLeader !== "") {
            mySpecialRecord = mySpecialRecord + myLeader + ",";
        }


        // Loop for the other fields
        for (var i = 1, row; row = myTable.rows[i]; i++) {

            // Retrieving tag data
            myTag = document.getElementById("tagCol" + i).value;

            //
            if (this.leaderList.indexOf(myTag) === -1) {


                // Retrieving ind1 data
                if (document.getElementById("ind1Col" + i).value) {
                    myInd1 = document.getElementById("ind1Col" + i).value
                } else {
                    myInd1 = " "
                };

                // Retrieving ind2 data
                if (document.getElementById("ind2Col" + i).value) {
                    myInd2 = document.getElementById("ind2Col" + i).value
                } else {
                    myInd2 = " "
                };

                // Retrieving Subfield data
                let myData = document.getElementById("divData" + i).getElementsByTagName("DIV");

                let lenMyData = myData.length;

                let mySubField = "";

                for (var j = 0; j < lenMyData; j++) {
                    let myCode = myData[j].getElementsByTagName("SELECT")[0].value;
                    //console.log("le code est  :" + myCode)

                    let myValue = myData[j].getElementsByTagName("INPUT")[0].value;
                    //console.log("la valeur est  :" + myValue)


                    // Definition of the dict to store the subfields
                    if (j === (lenMyData - 1)) {
                        //myListOfSubField = myListOfSubField +`{"code": "${myCode}","value": "${myValue}"}` ;
                        myListOfSubField = myListOfSubField + `{"code": "${myCode}","value": "${myValue}"}`;
                    } else {
                        myListOfSubField = myListOfSubField + `{"code": "${myCode}","value": "${myValue}"}` + ",";
                    }

                }

                // close the subfield string
                myListOfSubField = myListOfSubField + "]";
                //console.log(myListOfSubField)

                if (i === (totalRow.length - 1)) {
                    mySpecialRecord = mySpecialRecord + `"${myTag}":[{"indicators":["${myInd1}","${myInd2}"],"subfields": ${myListOfSubField}` + "}]}";
                } else {
                    mySpecialRecord = mySpecialRecord + `"${myTag}":[{"indicators":["${myInd1}","${myInd2}"],"subfields": ${myListOfSubField}` + "}],";
                }

                myListOfSubField = "[";

            }

        }

        //console.log(mySpecialRecord)

        // Retrieving the value of the type of Record
        const typeRecord = this.typeRecordToUpdate;

        // Saving the Data
        let data = mySpecialRecord;

        console.log(data)

        // cleaning 

        this.typeEditMode = "INIT"

        this.updateFullRecord(this.prefixUrl + typeRecord + "/" + this.idToUpdate, data);
        //this.updateRecord(this.prefixUrl + typeRecord + "/1", data) not good

        this.typeRecordToUpdate = "";
        this.idToUpdate = "";

        // showing the save button
        //var btn = document.getElementById("btnSaveRecord")
        //btn.style.display = "block";

    }


    // Update at the TAG level
    generateDataTagToUpdate() {

        // my data variable
        let myRecord = [];
        //let mySpecialRecord = '{"_id": ' + this.idToUpdate + ', ';
        let mySpecialRecord = "";

        //let myTagLine={};
        let myTag = []
        let myInd1 = []
        let myInd2 = []
        let myListOfSubField = "[";
        let myData = "";
        let recup = "";

        // Retrieving the table
        const myTable = document.getElementById("tableNewRecord");

        // Retrieving all the rows
        const totalRow = myTable.getElementsByTagName("TR");

        // console.log(totalRow)

        for (var i = 1, row; row = myTable.rows[i]; i++) {

            // Retrieving tag data
            myTag = document.getElementById("tagCol" + i).value;

            if (this.leaderList.indexOf(myTag) !== -1) {
                //mySpecialRecord=`{"${myTag}" :["${document.getElementById("divData" + i).getElementsByTagName("DIV")[0].getElementsByTagName("INPUT")[0].value}"]}`
                mySpecialRecord = document.getElementById("divData" + i).getElementsByTagName("DIV")[0].getElementsByTagName("INPUT")[0].value
                this.indexRecordToUpdate = 1;
            } else {

                // Retrieving ind1 data
                if (document.getElementById("ind1Col" + i).value) {
                    myInd1 = document.getElementById("ind1Col" + i).value
                } else {
                    myInd1 = " "
                };

                // Retrieving ind2 data
                if (document.getElementById("ind2Col" + i).value) {
                    myInd2 = document.getElementById("ind2Col" + i).value
                } else {
                    myInd2 = " "
                };
                //myInd2 = document.getElementById("ind2Col" + i).value;

                // Retrieving Subfield data
                let myData = document.getElementById("divData" + i).getElementsByTagName("DIV");

                // Retrieving xref data
                let myXrefData = document.getElementById("divXref" + i).getElementsByTagName("INPUT");

                let lenMyData = myData.length;

                let mySubField = "";

                for (var j = 0; j < lenMyData; j++) {
                    // Code management
                    let myCode = myData[j].getElementsByTagName("SELECT")[0].value.trimEnd();
                    console.log("le code est  :" + myCode)

                    // Value management
                    let myValue = myData[j].getElementsByTagName("INPUT")[0].value.trimEnd();
                    console.log("la valeur est  :" + myValue)

                    // xref management
                    let myXref=0;
                    if (parseInt(myXrefData[j].value.trimEnd(),10)>0){
                       myXref = parseInt(myXrefData[j].value.trimEnd(),10);
                    }
                     
                    console.log("la valeur est  :" + myXref)


                    // Definition of the dict to store the subfields

                    // xref
                    if (myXref!==0){
                        if (j === (lenMyData - 1)) {
                            myListOfSubField = myListOfSubField + `{"code": "${myCode}","value": "${myValue}","xref": ${myXref}}`;
                        } else {
                            myListOfSubField = myListOfSubField + `{"code": "${myCode}","value": "${myValue}","xref": ${myXref}}` + ",";
                        }
                    }

                    // no xref
                    if (myXref===0){
                        if (j === (lenMyData - 1)) {
                            myListOfSubField = myListOfSubField + `{"code": "${myCode}","value": "${myValue}"}`;
                        } else {
                            myListOfSubField = myListOfSubField + `{"code": "${myCode}","value": "${myValue}"}` + ",";
                        }
                    }

                }

                // close the subfield string
                myListOfSubField = myListOfSubField + "]";


                if (i === (totalRow.length - 1)) {
                    console.log("Inside")
                    //mySpecialRecord = mySpecialRecord + `"${myTag}":[{"indicators":["${myInd1}","${myInd2}"],"subfields": ${myListOfSubField}` + "}]}";
                    mySpecialRecord = mySpecialRecord + `{"indicators":["${myInd1}","${myInd2}"],"subfields": ${myListOfSubField}` + "}";

                } else {
                    mySpecialRecord = mySpecialRecord + `"${myTag}":[{"indicators":["${myInd1}","${myInd2}"],"subfields": ${myListOfSubField}` + "}],";
                }

                myListOfSubField = "[";
            }



        }



        // Retrieving the value of the type of Record

        const typeRecord = this.typeRecordToUpdate;
        // Saving the Data
        let data = mySpecialRecord;

        console.log(data)

        //var myUrl1=this.prefixUrl + this.recordType + "/" + this.idToUpdate +"/fields/" + this.tagRecordToUpdate +"/"+ (this.indexRecordToUpdate-1)+"?format=jmarcnx";
        var myUrl1 = this.prefixUrl + this.recordType + "/" + this.idToUpdate + "/fields/" + this.tagRecordToUpdate + "/" + (this.indexRecordToUpdate - 1);

        this.updateTagRecord(myUrl1, data)

        // cleaning 
        // this.typeRecordToUpdate = "";
        // this.idToUpdate = "";
        // this.tagRecordToUpdate = "";
        // this.indexRecordToUpdate = "";
        this.editMode = "False"


        // showing the save button
        var btn = document.getElementById("btnSaveRecord")
        btn.style.display = "block";

    }


    // update the number of lines variable

    updateNumberOfLineRecord() {
        // check if the div detail is already created 
        let myNumber = document.getElementById("valNumLineNewRecord");
        if (myNumber !== null) {
            // assign the new value of the variable
            myNumber.innerHTML = this.rowLineNewRecord;
        }
    }

    // get the ID of the record
    getRecordType(url) {
        if (url) {
            // check if the string contains auths or bibs
            if (url.includes("auths")) {
                return "auths"
            }

            if (url.includes("bibs")) {
                return "bibs"
            }
        } else {
            return "N/A"
        }
    }

    // get the ID of the record
    getRecordID() {
        return this.recordNumber;
    }

    // get the url of the record first load
    getUrlAPI() {
        //return this.getAttribute('url')+"?format=jmarcnx";
        return this.getAttribute('url');
    }

    // get the token value
    getToken() {
        return this.getAttribute('token');
    }

    // get the API URL Prefix
    getPrefix() {
        var apiPrefix = this.getAttribute('prefix')
        if (apiPrefix) {
            return apiPrefix;
        } else {
            return "https://czwkm00smd.execute-api.us-east-1.amazonaws.com/dev/api/";
        }
    }

    setUrlAPI(myUrlApi) {
        // Reflect the value of the open property as an HTML attribute.
        if (myUrlApi) {
            this.setAttribute('name', 'myUrlApi');
        } else {
            this.setAttribute('name', 'not defined');
        }
    }

    createHeaderComponent() {

        /////////////////////////////////////////////////////////////////////////////////
        // creation of the header of the component
        /////////////////////////////////////////////////////////////////////////////////

        let that = this;

        // create the div for the _id
        let divHeader = document.createElement("DIV");
        divHeader.innerHTML = "<h3> DHLME version 1.0 </h3> ";

        // Adding the name of the div
        divHeader.setAttribute("id", "divHeader");

        // Adding the style
        divHeader.className = "mt-3 mb-3 text-left text-success";

        // Adding the div to the page
        this.appendChild(divHeader);

        // create the div for the data
        let divContentHeader = document.createElement("DIV");
        divContentHeader.id = "divContentHeader";
        this.appendChild(divContentHeader);

        // create the div for the mail
        let divMailHeader = document.createElement("DIV");
        divMailHeader.id = "divMailHeader";
        this.appendChild(divMailHeader);

        let isToken = this.getToken();

        if (isToken !== "") {

            // Display the button for the displaying a new record
            let btnDisplayNewRecordHeader = document.createElement("BUTTON");
            btnDisplayNewRecordHeader.className = "btn btn-secondary mr-2 mb-2";
            btnDisplayNewRecordHeader.id = "btnDisplayNewRecord";
            btnDisplayNewRecordHeader.innerHTML = "Display a new record";
            divContentHeader.appendChild(btnDisplayNewRecordHeader);

            btnDisplayNewRecordHeader.setAttribute('data-toggle', 'modal');
            btnDisplayNewRecordHeader.setAttribute('data-target', '#myModal');

            // adding the logic to call the new url
            btnDisplayNewRecordHeader.addEventListener("click", () => {
                document.getElementById("modalTitle").innerHTML = "<div class='alert alert-success mt-2' role='alert'>Display one record (collection/recordnumber)</div>";
                document.getElementById("modalContent").innerHTML = "<div class='form-group'><label for='modalUrl'>Please insert the url of the record</label><input type='text' class='form-control' id='modalUrl'></div>";
                let myButtonHeader = document.getElementById("modalButton");
                myButtonHeader.innerHTML = "Display";
            });

            document.getElementById("modalButton").addEventListener("click", () => {
                let myVal = document.getElementById("modalUrl");
                if (myVal) {
                    this.getDataFromApi(myVal.value);
                }
                document.getElementById("modalClose").click();
            })

            // create the button for a new record

            let btnCreateNewRecord = document.createElement("BUTTON");
            btnCreateNewRecord.className = "btn btn-primary mr-2 mb-2";
            btnCreateNewRecord.id = "btnCreateNewRecord";
            btnCreateNewRecord.innerHTML = "Create a new record";
            divContentHeader.appendChild(btnCreateNewRecord);

            // adding the logic to call the new url
            btnCreateNewRecord.addEventListener("click", () => {
                this.typeEditMode = "CREATERECORD"
                let divRecordType = document.getElementById("divRecordType");

                if (divRecordType == null) {
                    let myHtml = document.createElement("DIV");
                    myHtml.innerHTML = `<select class="custom-select" id="selectTypeRecord" style="width: 300px;">
                                        <!--<option selected>Please select the record type</option>->
                                        <option value="bibs" selected>Bibliographic record</option>
                                        <option value="auths">Authority Record</option>
                                </select>`
                    myHtml.id = "divRecordType"
                    myHtml.className = "mr-2 mb-2";
                    divContentHeader.appendChild(myHtml);
                }

                if (divRecordType !== null) {
                    divRecordType.innerHTML = `<select class="custom-select" id="selectTypeRecord" style="width: 300px;">
                            
                                        <option value="bibs" selected>Bibliographic record</option>
                                        <option value="auths">Authority Record</option>
                                </select>`
                }

                const myDiv = document.getElementById("divNewRecord");
                if (myDiv) {
                    this.removeDiv(myDiv);
                    this.tableNewRecordCreated = false;
                    this.rowLineNewRecord = 0;
                }

                this.createFrameNewRecord();



            });

            // create the button for adding a new line for the record

            let btnAddingNewLine = document.createElement("BUTTON");
            btnAddingNewLine.className = "btn btn-info mr-2 mb-2";
            btnAddingNewLine.id = "btnAddingNewLine";
            btnAddingNewLine.innerHTML = "<i class='fa fa-plus' aria-hidden='true'> Tag </i>";
            divContentHeader.appendChild(btnAddingNewLine);

            // adding the logic to call the new url
            btnAddingNewLine.addEventListener("click", () => {
                this.addNewLineRecord(this.rowLineNewRecord);
            });

            // create the button for deleting a new line for the record

            let btnDeletingNewLine = document.createElement("BUTTON");
            btnDeletingNewLine.className = "btn btn-info mr-2 mb-2";
            btnDeletingNewLine.id = "btnDeletingNewLine";
            btnDeletingNewLine.innerHTML = "<i class='fa fa-minus' aria-hidden='true'> Tag </i>";
            divContentHeader.appendChild(btnDeletingNewLine);

            // adding the logic to call the new url
            btnDeletingNewLine.addEventListener("click", () => {
                this.removeLastLineRecord();
            });

            // create the button for adding a new subfield

            let btnAddNewSubField = document.createElement("BUTTON");
            btnAddNewSubField.className = "btn btn-info mr-2 mb-2";
            btnAddNewSubField.id = "btnAddNewSubField";
            btnAddNewSubField.innerHTML = "<i class='fa fa-plus' aria-hidden='true'> Subfield </i>";
            divContentHeader.appendChild(btnAddNewSubField);

            // adding the logic to call the new url
            btnAddNewSubField.addEventListener("click", () => {
                this.addNewSubFieldLine();
            });

            // create the button for deleting a new subfield

            let btnDelNewSubField = document.createElement("BUTTON");
            btnDelNewSubField.className = "btn btn-info mr-2 mb-2";
            btnDelNewSubField.id = "btnDelNewSubField";
            btnDelNewSubField.innerHTML = "<i class='fas fa-minus' aria-hidden='true'> Subfield </i>";
            divContentHeader.appendChild(btnDelNewSubField);

            // adding the logic to call the new url
            btnDelNewSubField.addEventListener("click", () => {
                this.delNewSubFieldLine();
            });

            // save the record button

            let btnSaveRecord = document.createElement("BUTTON");
            btnSaveRecord.className = "btn btn-success mr-2 mb-2";
            btnSaveRecord.id = "btnSaveRecord";
            btnSaveRecord.innerHTML = "Save the record";
            divContentHeader.appendChild(btnSaveRecord);

            // adding the logic to call the new url
            btnSaveRecord.addEventListener("click", () => {
                this.generateDataFullRecordToUpdateNewVersion(0);
                this.typeEditMode = "INIT";
            });

            // updtate record button

            let btnUpdateRecord = document.createElement("BUTTON");
            btnUpdateRecord.className = "btn btn-warning mr-2 mb-2";
            btnUpdateRecord.id = "btnUpdateRecord";
            btnUpdateRecord.innerHTML = "Update record";
            divContentHeader.appendChild(btnUpdateRecord);


            // adding the logic to call to edit a record
            btnUpdateRecord.addEventListener("click", () => {
                if (this.typeEditMode === "TAGRECORD") {
                    this.generateDataTagToUpdate();
                }

                if (this.typeEditMode === "FULLRECORD") {
                    this.generateDataFullRecordToUpdateNewVersion(1);
                }

            });

            // edit record button

            let btnEditRecord = document.createElement("BUTTON");
            btnEditRecord.className = "btn btn-warning mr-2 mb-2";
            btnEditRecord.id = "btnEditRecord";
            btnEditRecord.innerHTML = "Edit record";
            divContentHeader.appendChild(btnEditRecord);


            // adding the logic to call to edit a record
            btnEditRecord.addEventListener("click", () => {
                this.typeEditMode = "FULLRECORD"
                this.displayFullRecordEditMode();
            });

            // clone record button

            let btnCloneRecord = document.createElement("BUTTON");
            btnCloneRecord.className = "btn btn-warning mr-2 mb-2";
            btnCloneRecord.id = "btnCloneRecord";
            btnCloneRecord.innerHTML = "Clone record";
            divContentHeader.appendChild(btnCloneRecord);


            // adding the logic to call to clone a record
            btnCloneRecord.addEventListener("click", () => {
                this.generateDataFullRecordToUpdateNewVersion(2);
                this.typeEditMode = "INIT";
            });

            // Adding the dropdown list to define the type of record
            let myHtml = document.createElement("DIV");
            myHtml.innerHTML = `<select class="custom-select" id="selectTypeRecord" style="width: 300px;">
                                <option value="bibs" selected>Bibliographic record</option>
                                <option value="auths">Authority Record</option>
                        </select>`
            myHtml.id = "divRecordType"
            myHtml.className = "mr-2 mb-2";
            divContentHeader.appendChild(myHtml);

            this.manageDisplayButton();

        } else {
            divHeader.innerHTML = "<h3>DHLME version 1.0 (Unknown User) </h3> ";
        }
    }

    // return the value of the line
    getDataLine(tableId, callback) {
        var table = document.getElementById(tableId),
            rows = table.getElementsByTagName("tr"),
            i;
        for (i = 0; i < rows.length; i++) {
            table.rows[i].onclick = function(row) {
                return function() {
                    callback(row);
                };
            }(table.rows[i]);
        }
    }

    // Display the full record in edit Mode
    displayFullRecordEditMode() {

        this.typeRecordToUpdate = this.recordType;
        this.idToUpdate = this.recordNumber;

        //check if the divNewRecord is already displayed
        let myDiv = document.getElementById("divNewRecord");
        if (myDiv) {
            this.removeDiv(myDiv);
            this.tableNewRecordCreated = false;
            this.rowLineNewRecord = 0;
        }

        // for loop avec le nombre de row 
        let myRowsOrigin = document.getElementById("tableData").rows;
        //console.log(myRowsOrigin)


        // display the framework for the new record
        this.createFrameNewRecord();

        //let myRowsDestination=document.getElementById("tableNewRecord").rows;

        let tableSize = myRowsOrigin.length - 1;
        //console.log("la taille est : " + tableSize)


        for (let i = 1; i <= tableSize; i++) {

            for (let j = 0; j < 4; j++) {
                //console.log(myRowsOrigin[i].cells[j].innerText);
                if (i !== 0) {
                    // TAG
                    if (j == 0) {
                        //console.log(myRowsOrigin[i].cells[j].innerText);
                        document.getElementById("tagCol" + i).value = myRowsOrigin[i].cells[j].innerText;
                    }
                    // IND1
                    if (j == 1) {
                        //console.log(myRowsOrigin[i].cells[j].innerText);
                        document.getElementById("ind1Col" + i).value = myRowsOrigin[i].cells[j].innerText;
                    }
                    // IND2
                    if (j == 2) {
                        //console.log(myRowsOrigin[i].cells[j].innerText);
                        document.getElementById("ind2Col" + i).value = myRowsOrigin[i].cells[j].innerText;
                    }
                    // VALUE
                    if (j == 3) {
                        //console.log(myRowsOrigin[i].cells[j].innerText);
                        //document.getElementById("value"+i).value=myRowsOrigin[i].cells[j].innerText;
                        // (document.getElementById("tagCol"+i).value<"009")

                        if (Number(document.getElementById("tagCol" + i).value) < 10) {
                            // Management of the leader
                            //console.log(Number(document.getElementById("tagCol"+i).value))
                            document.getElementById("code" + i).value = "N/A";
                            document.getElementById("value" + i).value = myRowsOrigin[i].cells[j].innerText;
                        } else {

                            // Management of one normal field
                            let recupSubFieldValues = myRowsOrigin[i].cells[j].innerText.split("|");
                            //console.log(recupSubFieldValues)
                            let myBox = document.getElementById("checkboxCol" + i);
                            let myLine = i;

                            for (let y = 0; y < (recupSubFieldValues.length - 1); y++) {
                                let myCode = "";
                                let myValue = "";
                                let myXref=0

                                //console.log("la valeur de y est : " + y)
                                if (y === 0) {
                                    myCode = document.getElementById("code" + myLine);
                                    myCode.value = recupSubFieldValues[y].charAt(1).trim();

                                    // xref Management if there is a value
                                    if (recupSubFieldValues[y].includes("@@@")) {
                                        
                                        let dataX=recupSubFieldValues[y].substring(2).split("@@@");
                                        myValue = document.getElementById("value" + myLine);
                                        myValue.value = dataX[0].trim();
                                        myXref = document.getElementById("inputXref" + myLine);
                                        myXref.value = parseInt(dataX[1].trim());
                                    } else{
                                        myValue = document.getElementById("value" + myLine);
                                        myValue.value =recupSubFieldValues[y].substring(2).trim();
                                    }
                                    
                                } else {

                                    //console.log("la valeur de myBox est : "+ myBox.value)
                                    myBox.checked = true;
                                    this.addNewSubFieldLine();

                                    let recupSubFieldValues1 = recupSubFieldValues[y].split("   ");

                                    myCode = document.getElementById("divData" + i).lastChild.getElementsByTagName("SELECT")[0];
                                    myCode.value = recupSubFieldValues1[0].charAt(1).trim();            

                                    myValue = document.getElementById("divData" + i).lastChild.getElementsByTagName("INPUT")[0];
                                   
         
                                    ///////////////////////////////////////////////////////////////////////
                                    // xref Management if there is a value
                                    ///////////////////////////////////////////////////////////////////////

                                    if (recupSubFieldValues1.includes("@@@")) {
                                        
                                        let dataX=recupSubFieldValues1[y].substring(2).split("@@@");
                                        myValue.value = dataX[0].trim();
                                        myXref = document.getElementById("divXref"+ i).lastChild.getElementsByTagName("INPUT")[0];
                                        myXref.value = parseInt(dataX[1].trim());
                                    } else {
                                        myValue.value = recupSubFieldValues1[1].trim();
                                    }
                                    ///////////////////////////////////////////////////////////////////////

                                    myBox.checked = false;

                                }

                            }

                        }


                    }
                }

            }
            if (i !== tableSize) {
                this.addNewLineRecord();
            }
        }
    }


    //Display the tag selected in edit Mode

    displayDataTableEditMode() {

        // Hide the button save the record
        var btn = document.getElementById("btnSaveRecord");
        btn.style.display = "none";

        // retrieving some parameters

        //this.idToUpdate = this.recordNumber;

        this.typeRecordToUpdate = this.recordType;
        // retrieving the line number
        let recup = 0;
        // for loop avec le nombre de row 
        this.getDataLine("tableData", row => {
            // retrieving the data
            const yls = row.rowIndex;
            const myData = document.getElementsByClassName("dataProvider")[yls].id;

            // check if the divNewRecord is already displayed
            const myDiv = document.getElementById("divNewRecord");
            if (myDiv) {
                this.removeDiv(myDiv);
                this.tableNewRecordCreated = false;
                this.rowLineNewRecord = 0;
            }
            // display the framework for the new record
            this.createFrameNewRecord();

            // inserting the values in an array
            const recupValue = myData.split("//")

            // inserting values from the record selected
            let myTag = document.getElementById("tagCol1");
            let myIND1 = document.getElementById("ind1Col1");
            let myIND2 = document.getElementById("ind2Col1");


            myTag.value = recupValue[1];
            myIND1.value = recupValue[2];
            myIND2.value = recupValue[3];


            // Management of the subfield
            const recupSubFieldValues = recupValue[4].split("|")
            let myLine = 1;
            const myBox = document.getElementById("checkboxCol1");

            for (let i = 0; i < (recupSubFieldValues.length - 1); i++) {
                let myCode = "";
                let myValue = "";

                if (i === 0) {
                    myCode = document.getElementById("code" + myLine);
                    myCode.value = recupSubFieldValues[i].charAt(1).trim();
                    myValue = document.getElementById("value" + myLine);
                    myValue.value = recupSubFieldValues[i].substring(2).trim();
                } else {
                    myBox.checked = true;
                    this.addNewSubFieldLine();
                    myCode = document.getElementById("divData1").lastChild.getElementsByTagName("SELECT")[0];
                    myCode.value = recupSubFieldValues[i].charAt(1).trim();
                    myValue = document.getElementById("divData1").lastChild.getElementsByTagName("INPUT")[0];
                    myValue.value = recupSubFieldValues[i].substring(2).trim();

                }
                //let myXref= document.getElementById("xref" + myLine).value;
                myLine++;
            }


            ////////////////

        });


    }

    // function generating the record with the value from the API
    displayDataFromApi(myDataList, myDataSize, myData) {


        // check if the record is already displayed
        let divNewRecord = document.getElementById("divNewRecord");
        if (divNewRecord !== null) {
            divNewRecord.innerHTML = " ";
        }
        let divRecordType = document.getElementById("divRecordType");
        if (divRecordType !== null) {
            divRecordType.innerHTML = " ";
        }

        // loop to display the values
        let md = myDataList.sort();

        /////////////////////////////////////////////////////////////////////////////////
        // creation of the header of the component
        /////////////////////////////////////////////////////////////////////////////////

        // create the div for the _id
        // check if the div is already created if no we can create it
        let divDetail = document.getElementById("divDetail");
        if (divDetail === null) {
            divDetail = document.createElement("DIV");
            // Adding the div to the page
            this.appendChild(divDetail);
        }

        this.recordType = this.getRecordType(this.url);
        // be sure to empty the div
        let recupId = this.getRecordID();

        divDetail.innerHTML = "<h3 class='text-dark'>Record ID : " + myData["_id"] + "  </h3>  <span class='text-dark'>Record Type:  " + this.recordType + "</span>";

        // Adding the ID
        divDetail.id = "divDetail";

        this.recordNumber = myData["_id"];
        this.getRecordID();

        // Adding the style
        divDetail.className = "mt-3 mb-3 text-left text-success";

        // check if the div is already created if no we can create it
        let divContent = document.getElementById("divContent");

        if (divContent !== null) {
            divContent.innerHTML = " ";
        }

        // create the div for the data
        if (divContent === null) {
            divContent = document.createElement("DIV");
            this.appendChild(divContent);
            divContent.id = "divContent";

            // create the div for the mail
            let divMail = document.createElement("DIV");
            divMail.id = "divMail";
            this.appendChild(divMail);
        }

        // create the hr 
        let hr1 = document.createElement("HR");
        divContent.appendChild(hr1);

        // create the button for the deletion
        let btnDeleteRecord = document.createElement("BUTTON");
        btnDeleteRecord.className = "btn btn-danger mr-2";
        btnDeleteRecord.id = "btnDeleteRecord";
        btnDeleteRecord.innerHTML = "Delete this record";
        if (this.myToken) {
            divContent.appendChild(btnDeleteRecord);
        }
        btnDeleteRecord.setAttribute('data-toggle', 'modal');
        btnDeleteRecord.setAttribute('data-target', '#myModal');

        // adding the logic to delete a record
        btnDeleteRecord.addEventListener("click", () => {
            document.getElementById("modalTitle").innerHTML = "<div class='alert alert-danger mt-2' role='alert'>Delete the record</div>";
            document.getElementById("modalContent").innerHTML = "Be careful, you are about to delete the record with the ID :   <strong>" + this.getRecordID() + "</strong>";
            let myButton = document.getElementById("modalButton");
            myButton.innerHTML = "Delete";
            myButton.addEventListener("click", () => {
                this.deleteDataFromApi(this.recordType, this.recordNumber);
                document.getElementById("modalClose").click();
            })
        })

        // create the links for other formats
        let displayMarc = document.createElement("A");
        displayMarc.id = "btnDisplayMarc";
        displayMarc.innerHTML = `<a href="${this.prefixUrl + this.recordType + "/" + this.getRecordID()}?format=mrk" target="_blank" aria-pressed="true">MARC format</a>`
        divContent.appendChild(displayMarc);

        let displayXML = document.createElement("A");
        displayXML.id = "btnDisplayXML";
        displayXML.innerHTML = `<a class="ml-2" href="${this.prefixUrl + this.recordType + "/" + this.getRecordID()}?format=xml" target="_blank" aria-pressed="true">XML format</a>`
        divContent.appendChild(displayXML);

        // create the hr 
        let hrx = document.createElement("HR");
        divContent.appendChild(hrx);

        // create the files framework
        if (this.filesAvailable.length > 0) {
            // adding the logic
            let myHeader = document.createElement("H5");
            myHeader.innerHTML = "<span class='badge badge-pill badge-success'>" + this.filesAvailable.length + "</span> File(s) available , Click the file path to display the file!!! ";
            let myTable = document.createElement("TABLE");
            myTable.className = "table table-striped"
            myTable.innerHTML += "<div>"
            myTable.innerHTML += "<table><thead> <tr><th>Language</th><th>File path</th></tr></thead><tbody>";
            let i;
            let myTableContent = "";
            for (i = 0; i < this.filesAvailable.length; i++) {
                myTableContent += "<tr><td><span class='text-center ml-2'>" + this.filesAvailable[i]['language'] + "</span></td><td><a href='" + this.filesAvailable[i]['url'] + "' target='_blank'>" + this.filesAvailable[i]['url'] + "</a></td></tr>"
            }
            myTable.innerHTML += myTableContent + "</tbody></table></div>"
            divContent.appendChild(myHeader);
            divContent.appendChild(myTable);

        }

        // adding a new hr 
        let hr2 = document.createElement("HR");
        divContent.appendChild(hr2);

        /////////////////////////////////////////////////////////////////////////////////
        // creation of the header of the table
        /////////////////////////////////////////////////////////////////////////////////

        // creation of the html tags

        let table = document.createElement("TABLE");
        let thead = document.createElement("THEAD");
        let tr = document.createElement("TR");
        let th1 = document.createElement("TH");
        let th2 = document.createElement("TH");
        let th3 = document.createElement("TH");
        let th4 = document.createElement("TH");
        let th5 = document.createElement("TH");
        //let th6 = document.createElement("TH");


        // add the tags to the parent

        tr.appendChild(th1);
        tr.appendChild(th2);
        tr.appendChild(th3);
        tr.appendChild(th4);
        tr.appendChild(th5);
        //tr.appendChild(th6);

        thead.appendChild(tr);
        table.appendChild(thead);

        // some styling for the header
        thead.className = "thead-light";
        table.className = "table-sm table-responsive ";
        table.id = "tableData"

        // add the values of the columns
        th1.innerHTML = "<span class='badge badge-secondary'> TAG </span>";
        th2.innerHTML = "<span class='badge badge-secondary'> IND1 </span>";
        th3.innerHTML = "<span class='badge badge-secondary'> IND2 </span>";
        th4.innerHTML = "<span class='badge badge-secondary'> VALUE </span>";
        if (this.myToken) {
            th5.innerHTML = "<span class='badge badge-secondary dataProvider'> EDIT </span>";
        }
        //76th6.innerHTML = "<span class='badge badge-secondary'> XREF </span>";
        divContent.appendChild(table);
        this.appendChild(divContent);
        this.appendChild(divDetail);


        /////////////////////////////////////////////////////////////////////////////////
        // Loop the records and build the table
        /////////////////////////////////////////////////////////////////////////////////

        for (let i = 0; i < myDataSize; i++) {
            let newIndex = i;

            // Display the metadata part
            //if ((myDataList[i] !== "_id") && (myDataList[i] < "029")) {
            if ((myDataList[i] !== "_id") && (myDataList[i] < "010")) {

                let tr = document.createElement("TR");
                let th1 = document.createElement("TH");
                let th2 = document.createElement("TH");
                let th3 = document.createElement("TH");
                let th4 = document.createElement("TH");
                let th5 = document.createElement("TH");

                th1.innerHTML = "<span class='badge badge-pill badge-secondary'>" + myDataList[i] + "</span>";
                th2.innerHTML = "N/A";
                th3.innerHTML = "N/A";
                th4.innerHTML = myData[myDataList[i]];
                if (this.myToken) {
                    th5.innerHTML = "<span class='badge badge-pill badge-warning dataProvider' id='" + this.recordType + "//" + th1.innerText + "//" + th2.innerText + "//" + th3.innerText + "//" + th4.innerText + "'><i class='fas fa-edit'>  </i></span>";
                    /////// 

                    th5.addEventListener("click", () => {

                        // Edit the value of the edit mode
                        this.typeEditMode = "TAGRECORD"
                        this.editMode = "True"

                        // retrieving some parameters

                        this.idToUpdate = this.recordNumber;

                        // retrieving the line number
                        let recup = 0;
                        this.getDataLine("tableData", row => {
                            // retrieving the data
                            const myData = document.getElementsByClassName("dataProvider")[row.rowIndex].id;

                            const myDiv = document.getElementById("divNewRecord");
                            if (myDiv) {
                                this.removeDiv(myDiv);
                                this.tableNewRecordCreated = false;
                                this.rowLineNewRecord = 0;
                            }
                            // display the framework for the new record
                            this.createFrameNewRecord();

                            // inserting the values in an array
                            const recupValue = myData.split("//")
                            console.log(recupValue)

                            this.tagRecordToUpdate = recupValue[1];
                            this.indexRecordToUpdate = recupValue[5];

                            // inserting values from the record selected
                            let myTag = document.getElementById("tagCol1");
                            let myIND1 = document.getElementById("ind1Col1");
                            let myIND2 = document.getElementById("ind2Col1");
                            let myCode = document.getElementById("code1");
                            let myValue = document.getElementById("value1");


                            myTag.value = recupValue[1];
                            myIND1.value = recupValue[2];
                            myIND2.value = recupValue[3];
                            myCode.value = 'N/A';
                            myValue.value = recupValue[4];


                        });


                    })

                    ///////

                }

                tr.appendChild(th1);
                tr.appendChild(th2);
                tr.appendChild(th3);
                tr.appendChild(th4);
                tr.appendChild(th5);
                thead.appendChild(tr);
                table.appendChild(thead);

            }

            // Display the subfield part
            //if (parseInt(myDataList[i], 10) >= 29) {
            if (parseInt(myDataList[i], 10) >= 10) {
                let numOccur = myData[myDataList[i]].length;
                for (let j = 0; j < myData[myDataList[i]].length; j++) {

                    let tr = document.createElement("TR");
                    let th1 = document.createElement("TH");
                    let th2 = document.createElement("TH");
                    let th3 = document.createElement("TH");
                    let th4 = document.createElement("TH");
                    let th5 = document.createElement("TH");
  

                    let val1 = (myData[myDataList[i]][j]["indicators"][0] !== " ") ? myData[myDataList[i]][j]["indicators"][0] : " _ ";
                    let val2 = (myData[myDataList[i]][j]["indicators"][1] !== " ") ? myData[myDataList[i]][j]["indicators"][1] : " _ ";
                    th1.innerHTML = "<span class='badge badge-pill badge-secondary'>" + myDataList[i] + "</span>";
                    th2.innerHTML = val1;
                    th3.innerHTML = val2;


                    // retrieve the number of subfields
                    let numberSubfield = myData[myDataList[i]][j]["subfields"].length;

                    for (let k = 0; k < numberSubfield; k++) {
                        // loop for the subfields
                        
                        if (myData[myDataList[i]][j]["subfields"][k]["xref"]) {           
                            //th6.innerHTML +="<span class='text-success'>@" + myData[myDataList[i]][j]["subfields"][k]["xref"];+ " </span> "
                            th4.innerHTML += "<span class='text-primary'>$" + myData[myDataList[i]][j]["subfields"][k]["code"] + " </span> " + " " + myData[myDataList[i]][j]["subfields"][k]["value"] + "  <span class='text-success'>@@@" + myData[myDataList[i]][j]["subfields"][k]["xref"] + " </span> "+ "|";
                        }
                        else{
                            th4.innerHTML += "<span class='text-primary'>$" + myData[myDataList[i]][j]["subfields"][k]["code"] + " </span> " + " " + myData[myDataList[i]][j]["subfields"][k]["value"] + " |";
                        }

                    }

                    if (this.myToken) {

                        // building a string with the information about the TAG Line
                        th5.innerHTML = "<span class='badge badge-pill badge-warning'><span class='dataProvider' id='" + this.recordType + "//" + th1.innerText + "//" + th2.innerText + "//" + th3.innerText + "//" + th4.innerText + "//" + (j + 1) + "'><i class='fas fa-edit'> " + (j + 1) + "/" + numOccur + "  </i> </span></span>";
                        th5.addEventListener("click", () => {

                            // Edit the value of the edit mode
                            this.typeEditMode = "TAGRECORD"
                            this.editMode = "True"

                            // retrieving some parameters

                            this.idToUpdate = this.recordNumber;

                            // retrieving the line number
                            let recup = 0;
                            this.getDataLine("tableData", row => {
                                // retrieving the data
                                const yls = row.rowIndex;
                                const myData = document.getElementsByClassName("dataProvider")[yls].id;

                                // check if the divNewRecord is already displayed
                                const myDiv = document.getElementById("divNewRecord");
                                if (myDiv) {
                                    this.removeDiv(myDiv);
                                    this.tableNewRecordCreated = false;
                                    this.rowLineNewRecord = 0;
                                }
                                // display the framework for the new record
                                this.createFrameNewRecord();

                                // inserting the values in an array
                                const recupValue = myData.split("//")

                                this.tagRecordToUpdate = recupValue[1];
                                this.indexRecordToUpdate = recupValue[5];

                                // inserting values from the record selected
                                let myTag = document.getElementById("tagCol1");
                                let myIND1 = document.getElementById("ind1Col1");
                                let myIND2 = document.getElementById("ind2Col1");

                                myTag.value = recupValue[1];
                                myIND1.value = recupValue[2];
                                myIND2.value = recupValue[3];

                                // Management of the subfield
                                const recupSubFieldValues = recupValue[4].split("|")
                                console.log(recupSubFieldValues)
                                
                                let myLine = 1;
                                const myBox = document.getElementById("checkboxCol1");

                                for (let i = 0; i < (recupSubFieldValues.length - 1); i++) {
                                    let myCode = "";
                                    let myValue = "";
                                    let myXref =0;

                                    if (i === 0) {
                                        myCode = document.getElementById("code" + myLine);
                                        myCode.value = recupSubFieldValues[i].charAt(1).trim();

                                        // xref Management if there is a value
                                        if (recupSubFieldValues[i].includes("@@@")) {
                                            
                                            let dataX=recupSubFieldValues[i].substring(2).split("@@@");
                                            myValue = document.getElementById("value" + myLine);
                                            myValue.value = dataX[0].trim();
                                            myXref = document.getElementById("inputXref" + myLine);
                                            myXref.value = parseInt(dataX[1].trim());
                                        } else{
                                            myValue = document.getElementById("value" + myLine);
                                            myValue.value =recupSubFieldValues[i].substring(2).trim();
                                        }
                                   
                                    } else {
                                       
                                        myBox.checked = true;
                                        this.addNewSubFieldLine();
                                        
                                        myCode = document.getElementById("divData1").lastChild.getElementsByTagName("SELECT")[0];
                                        myCode.value = recupSubFieldValues[i].charAt(1).trim();
                                        
                                        myValue = document.getElementById("divData1").lastChild.getElementsByTagName("INPUT")[0];
                                        // xref Management if there is a value
                                        if (recupSubFieldValues.includes("@@@")) {
                                            
                                            let dataX=recupSubFieldValues[i].substring(2).split("@@@");
                                            myValue.value = dataX[0].trim();
                                            myXref = document.getElementById("divXref1").lastChild.getElementsByTagName("INPUT")[0];
                                            myXref.value = parseInt(dataX[1].trim());
                                        } else {
                                            myValue.value=recupSubFieldValues[i].substring(2).trim();
                                        }

                                    }
                                    myLine++;
                                }

                            });


                        })
                    }

                    // add the tags to the parent

                    tr.appendChild(th1);
                    tr.appendChild(th2);
                    tr.appendChild(th3);
                    tr.appendChild(th4);
                    tr.appendChild(th5);
                    //tr.appendChild(th6);
                    thead.appendChild(tr);

                }
            }
        }
        // Adding the div to the page
        this.appendChild(divContent);

    }


    // Main features
    connectedCallback() {
        this.typeEditMode = "INIT";
        this.createhiddenModalForm();
        this.createHeaderComponent();
        if (this.getUrlAPI()) {
            this.getDataFromApi(this.getUrlAPI());
            this.getRecordType(this.getUrlAPI());
        }
    }

    disconnectedCallback() {};

    attributeChangedCallback(attrName, oldVal, newVal) {};

}

// Define the new element
customElements.define('marc-record', MarcRecord);