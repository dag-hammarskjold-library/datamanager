// Class for the component
class MarcRecord extends HTMLElement {

    // invoke the constructor  
    constructor() {

        super();

        // Definition of the id of the component
        this.token = this.getAttribute('token');
        if (this.token == "True") {
            this.loggedIn = true;
        }
        else {
            this.loggedIn = false;
        }
        this.heigth = "1000px";
        this.width = "1500px";
        this.id = "marc-record";
        this.recordNumber = "";
        this.recordType = "";
        if(this.hasAttribute("coll")) {
            this.recordType = this.getAttribute("coll")
        }
        this.url = ""
        this.tableNewRecordCreated = false;
        this.displayRecord = false;
        this.rowLineNewRecord = 0;
        this.prefixUrl = this.getPrefix();
        this.editMode = "False";
        this.typeEditMode = "FULLRECORD"
        this.idToUpdate = "";
        this.typeRecordToUpdate = "";
        this.rowselected = 0;
        this.indexRecordToUpdate = "";
        this.tagRecordToUpdate = ""
        this.filesAvailable = [];
        this.history = [];
        this.leaderList = ['000', '001', '002', '003', '004', '005', '006', '007', '008', '009']
        this.savePrefix=""
        this.numRowCallingEvent=0;
        this.firstRecord="";
        this.secondRecord="";
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
            "            <div id='modalContent'>    </div> " +
            "            <div class='container' id='app'> </div>  " +  
            "            </div> " +
            "            <div class='modal-footer'> " +
            "            <button id='modalClose' type='button' class='btn btn-secondary' data-dismiss='modal'>Close</button> " +
            "            <button id='modalButton' type='button' class='btn btn-primary'> myButtonLabel  </button> " +
            "            </div>" +
            "        </div>" +
            "        </div>" +
            "        </div>";
    }

    // create the search modal form
    createSearchModalForm(){
        this.innerHTML+=`<div id='modalSearch' class="modal" tabindex="-1" role="dialog" style="height:800px;width:850px">
            <div class="modal-dialog" role="document">
            <div class="modal-content">
                <div class="modal-header">
                <h5 class="modal-title">Authorities search form</h5>
                <button type="button" class="close" data-dismiss="modal" aria-label="Close">
                    <span aria-hidden="true">&times;</span>
                </button>
                </div>
                <div class="modal-body">

                    <div>
                        <form id="live-search" action="" class="styled ml-5" method="post">
                            <fieldset>
                                <label for="tagToSearch">Tag</label>
                                <input type="text" class="text-input" id="tagToSearch"  value="" />
                            </fieldset>
                            <fieldset>
                                <label for="a">Subfield a</label>
                                <input type="text" class="text-input lookup" id="a"  value="" />
                            </fieldset>
                            <fieldset>
                                <label for="b">Subfield b</label>
                                <input type="text" class="text-input lookup" id="b" value="" />
                            </fieldset>
                            <fieldset>
                                <label for="c">Subfield c</label>
                                <input type="text" class="text-input lookup" id="c" value="" />
                            </fieldset>
                            <fieldset>
                                <label for="d">Subfield d</label>
                                <input type="text" class="text-input lookup" id="d" value="" />
                            </fieldset>
                        </form>
                    </div>
                    <div class="mt-2 ml-5 text-primary">
                    <p id="search_url"></p>
                    </div>
                    <div class="mt-2 ml-5 text-primary">
                    <p id="nb_results"></p>
                    </div>
                <div>
                    <ul id="authsList">
                        
                    </ul>
                </div>
                </div>
                <div class="modal-footer">
                <button id="executeQuery" type="button" class="btn btn-primary">Execute the query</button>
                <button type="button" class="btn btn-secondary" data-dismiss="modal">Exit </button>
                </div>
            </div>
            </div>
        </div>`;
        this.implementSearchAuthorities();
    }

    // function loading the templates 
    async loadTemplate(myCollection){
        this.url = this.getPrefix() + 'marc/' + myCollection + "/templates";

        let response = await fetch(this.url);
        if (response.ok) {
               
            let json = await response.json();
  
            let resultsList = json["data"];

            let sizeResults = resultsList.length

            if  (document.getElementById("selectListTemplate")) { 

                let dropdown = document.getElementById("selectListTemplate");

                dropdown.length = 0;

                let defaultOption = document.createElement('option');
                defaultOption.text = 'Choose your template';

                dropdown.add(defaultOption);
                dropdown.selectedIndex = 0;

                let option;
                for (let i = 0; i < sizeResults; i++) {
                  option = document.createElement('option');
                  let recup=resultsList[i].split("/")
                  option.text = recup[recup.length - 1];
                  option.value = recup[recup.length - 1];
                  dropdown.add(option);
                }
            
            } 

        } else {
            return divMailHeader.innerHTML = "<div class='alert alert-danger mt-2 alert-dismissible fade show' role='alert'>Something is wrong, HTTP-Error number : " + response.status + "</div>";
        }
    }


    // function fetching the data from the API
    async getDataFromApi(value) {
        this.url = this.prefixUrl + value;
        this.url1=this.url + "/history";

        // keep the url of the original record
        this.firstRecord=this.url
    	
        let response = await fetch(this.url);
        let response1 = await fetch(this.url1);  
        
        // process to fecth data for the full record
        if (response.ok) {

            let json = await response.json();
            let resultsList = Object.keys(json["data"]);
			
            // check if the files are available
			if ("files" in json["data"]) { 
			    this.filesAvailable = json["data"]["files"]
            }

            let resultsSize = resultsList.length;
            let results = json["data"];
            divMailHeader.innerHTML = "";
            this.displayRecord = true

            this.typeEditMode = "INIT"
            this.manageDisplayButton();
            this.displayDataFromApi(resultsList, resultsSize, results);

            // process to fecth data for the full record
            if (response1.ok) {
                let json1 = await response1.json();
                if (json1["data"]) {
                    this.history= json1["data"];    
                }
            }

        } else {
            return divMailHeader.innerHTML = "<div class='alert alert-danger mt-2 alert-dismissible fade show' role='alert'>Something is wrong, HTTP-Error number : " + response.status + "</div>";
        }
    }

    // function fetching the data of one specific field from the API
    async getDataFromApiForOneField (myUrl,myField){

    }

    // call the API for deletion
    async deleteDataFromApi(recordType, recordID) {

        let myString = this.prefixUrl + "marc/" + recordType + "/records/" + recordID;

        fetch(myString, {
                method: 'DELETE'
            })
            .then(response => {
                if (response.ok) {	
                    divMailHeader.innerHTML = "<div class='alert alert-success mt-2 alert-dismissible fade show' role='alert'>Record deleted!</div>";
                }

                if (!response.ok) {
                    response.json()
                        .then(json => {
                            divMailHeader.innerHTML = "<div class='alert alert-danger mt-2 alert-dismissible fade show' role='alert'>Something is wrong: " + json.message + "</div>";
                        });
                }
            })
            .catch(error => {
                divMailHeader.innerHTML = "<div class='alert alert-danger mt-2 alert-dismissible fade show' role='alert'>Something is wrong: " + error.message + "</div>";
            })

        this.typeEditMode = 'INIT';
        this.manageDisplayButton();
    }

    // call the API for creation
    async createRecord(url, data) {

        fetch(url, {
                method: 'POST',
                body: data
            })
            .then(response => {
                if (response.ok) {
                    response.text().then(function(p) {
						let parsed = new URL(JSON.parse(p)["result"]);
						let parts = parsed.pathname.split('/');
						let newUrl = '/records/' + parts[3] + '/' + parts[5];
						
                        window.history.pushState("object or string", "Title", newUrl);
                    });
                    
                    divMailHeader.innerHTML = "<div class='alert alert-success mt-2 alert-dismissible fade show' role='alert'>Record created!</div>";
                }
                if (!response.ok) {
                    response.json()
                        .then(json => {
                            divMailHeader.innerHTML = "<div class='alert alert-danger mt-2 alert-dismissible fade show' role='alert'>Something is wrong : " + json.message + "</div>";
                        });
                }
            })
            .catch(error => {
                divMailHeader.innerHTML = "<div class='alert alert-danger mt-2 alert-dismissible fade show' role='alert'>Something is wrong : " + error.message + "</div>";
            })

        this.typeEditMode = 'CREATERECORD';
        this.manageDisplayButton();
    }

        async cloneRecord(url, data) {

            fetch(url, {
                    method: 'POST',
                    body: data
                })
                .then(response => {
                    if (response.ok) {
                        divMailHeader.innerHTML = "<div class='alert alert-success mt-2 alert-dismissible fade show' role='alert'>Record cloned!</div>";
                    }
                    if (!response.ok) {
                        response.json()
                            .then(json => {
                                divMailHeader.innerHTML = "<div class='alert alert-danger mt-2 alert-dismissible fade show' role='alert'>Something is wrong : " + json.message + "</div>";
                            });
                    }
                })
                .catch(error => {
                    divMailHeader.innerHTML = "<div class='alert alert-danger mt-2 alert-dismissible fade show' role='alert'>Something is wrong : " + error.message + "</div>";
                })

            this.typeEditMode = 'CREATERECORD';
            this.manageDisplayButton();

        }

        // update at the record level
        async updateFullRecord(url, data) {
			
			console.log(data)

            fetch(url, {
                    method: 'PUT',
                    body: data
                })
                .then(response => {
					console.log('Response:', response)
                    if (response.ok) {
                        divMailHeader.innerHTML = "<div class='alert alert-success mt-2 alert-dismissible fade show' role='alert'>Full Record updated!</div>";
                    }
                    if (!response.ok) {
                        response.json()
                            .then(json => {
                                divMailHeader.innerHTML = "<div class='alert alert-danger mt-2 alert-dismissible fade show' role='alert'>Something is wrong : " + json.message + "</div>";
                            });
                    }
                })
                .catch(error => {
                    divMailHeader.innerHTML = "<div class='alert alert-danger mt-2 alert-dismissible fade show' role='alert'>Something is wrong : " + error.message + "</div>";
                })

            this.typeEditMode = 'FULLRECORD';
            this.manageDisplayButton();
        }


        // update at the tag level
        async updateTagRecord(url, data) {

            fetch(url, {
                    method: 'PUT',
                    body: data
                })
                .then(response => {
                    if (response.ok) {
                        this.typeEditMode = 'TAGRECORD';
                        this.manageDisplayButton();
                        this.indexRecord = "";
                        divMailHeader.innerHTML = "<div class='alert alert-success mt-2 alert-dismissible fade show' role='alert'>Record updated at the TAG level!</div>";

                    }
                    if (!response.ok) {
                        response.json()
                            .then(json => {
                                this.typeEditMode = 'TAGRECORD';
                                this.manageDisplayButton();
                                this.indexRecord = "";
                                divMailHeader.innerHTML = "<div class='alert alert-danger mt-2 alert-dismissible fade show' role='alert'>Something is wrong: " + json.message + "</div>";
                            });
                    }
                })
                .catch(error => {
                    this.typeEditMode = 'TAGRECORD';
                    this.manageDisplayButton();
                    this.indexRecord = "";
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
                if (document.getElementById("divCheckTemplate")) document.getElementById("divCheckTemplate").style.display = 'none';   
                if (document.getElementById("divListTemplate")) document.getElementById("divListTemplate").style.display = 'none';   
            }

            if (this.typeEditMode === 'TAGRECORD') {
                if (document.getElementById("btnAddingNewLine")) document.getElementById("btnAddingNewLine").style.display = 'none';
                if (document.getElementById("btnDeletingNewLine")) document.getElementById("btnDeletingNewLine").style.display = 'none';
                if (document.getElementById("btnAddNewSubField")) document.getElementById("btnAddNewSubField").style.display = 'inline';
                if (document.getElementById("btnDelNewSubField")) document.getElementById("btnDelNewSubField").style.display = 'inline';
                if (document.getElementById("btnSaveRecord")) document.getElementById("btnSaveRecord").style.display = 'none';
                if (document.getElementById("btnCreateNewRecord")) document.getElementById("btnCreateNewRecord").style.display = 'none';
                if (document.getElementById("btnCloneRecord")) document.getElementById("btnCloneRecord").style.display = 'none';
                if (document.getElementById("btnEditRecord")) document.getElementById("btnEditRecord").style.display = 'none';
                if (document.getElementById("btnUpdateRecord")) document.getElementById("btnUpdateRecord").style.display = 'inline';
                if (document.getElementById("divCheckTemplate")) document.getElementById("divCheckTemplate").style.display = 'none';  
                if (document.getElementById("divListTemplate")) document.getElementById("divListTemplate").style.display = 'none';    
            }

            if (this.typeEditMode === 'FULLRECORD') {
                if (document.getElementById("btnAddingNewLine")) document.getElementById("btnAddingNewLine").style.display = 'inline';
                if (document.getElementById("btnDeletingNewLine")) document.getElementById("btnDeletingNewLine").style.display = 'inline';
                if (document.getElementById("btnAddNewSubField")) document.getElementById("btnAddNewSubField").style.display = 'inline';
                if (document.getElementById("btnDelNewSubField")) document.getElementById("btnDelNewSubField").style.display = 'inline';
                if (document.getElementById("btnSaveRecord")) document.getElementById("btnSaveRecord").style.display = 'none';
                if (document.getElementById("btnCreateNewRecord")) document.getElementById("btnCreateNewRecord").style.display = 'none';
                if (document.getElementById("btnCloneRecord")) document.getElementById("btnCloneRecord").style.display = 'inline';
                if (document.getElementById("btnEditRecord")) document.getElementById("btnEditRecord").style.display = 'none';
                if (document.getElementById("btnUpdateRecord")) document.getElementById("btnUpdateRecord").style.display = 'inline';
                if (document.getElementById("divDetail")) document.getElementById("divDetail").style.display = 'inline';
                if (document.getElementById("divCheckTemplate")) document.getElementById("divCheckTemplate").style.display = 'none'; 
                if (document.getElementById("divListTemplate")) document.getElementById("divListTemplate").style.display = 'none';     
            }

            if (this.typeEditMode === 'CREATERECORD') {
                if (document.getElementById("btnAddingNewLine")) document.getElementById("btnAddingNewLine").style.display = 'inline';
                if (document.getElementById("btnDeletingNewLine")) document.getElementById("btnDeletingNewLine").style.display = 'inline';
                if (document.getElementById("btnAddNewSubField")) document.getElementById("btnAddNewSubField").style.display = 'inline';
                if (document.getElementById("btnDelNewSubField")) document.getElementById("btnDelNewSubField").style.display = 'inline';
                if (document.getElementById("btnSaveRecord")) document.getElementById("btnSaveRecord").style.display = 'inline';
                if (document.getElementById("btnCreateNewRecord")) document.getElementById("btnCreateNewRecord").style.display = 'none';
                if (document.getElementById("btnCloneRecord")) document.getElementById("btnCloneRecord").style.display = 'none';
                if (document.getElementById("btnEditRecord")) document.getElementById("btnEditRecord").style.display = 'none';
                if (document.getElementById("btnUpdateRecord")) document.getElementById("btnUpdateRecord").style.display = 'none';
                if (document.getElementById("divDetail")) document.getElementById("divDetail").style.display = 'none';
                if (document.getElementById("divRecordType")) document.getElementById("divRecordType").style.display = 'inline';
                if (document.getElementById("divCheckTemplate")) document.getElementById("divCheckTemplate").style.display = 'inline'; 
                if (document.getElementById("divListTemplate")) document.getElementById("divListTemplate").style.display = 'inline';   
            }
        }

        // implement the call of the modal for the authority search
        implementDblClick(){
            // adding the logic of the double click on the tag 
            let elements = document.getElementsByClassName("tagClass");

            let myDisplayModal =()=> {
                // creation de la modal
                $('#modalSearch').modal('show'); 
            };
            for (var i = 0; i < elements.length; i++) {
                elements[i].addEventListener('dblclick', myDisplayModal, false);
            } 
        }

        implementSearchAuthorities(){
            // adding the logic of the double click on the tag 
            let element = document.getElementById("executeQuery");
            element.addEventListener('click', this.searchAuthorities, false);
        }

        // searching authorities using modal
        searchAuthorities(){ 

            let that=this;

            // retrieve the tag value
            let myTag=document.getElementById("tagToSearch").value;
            
            // Setup. We'll normally get this endpoint URL from somewhere else.
            let component=document.getElementsByTagName("marc-record")[0];
            let prefix=component.getAttribute("prefix");
            //let endpoint = prefix+ 'bibs/lookup/'+myTag;
			let endpoint = prefix + "marc/bibs/lookup/" + myTag 
            
            // Initialize the search object, which we'll parameterize
            let search_obj = {};
            
            // Construct the parameterized URL to start with
            let search_url = "Query sent to the server " + endpoint + $.param(search_obj);
            
            // Display the URL in its own div/p
            //$("#search_url").text(search_url);
            
            // Define a timer
            let timer;

            // get the list of input fields
            let listInput=document.getElementsByClassName("lookup");
            let listInputSize=listInput.length;
            let queryString="";

            // generation of the list of parameters
            for (let index=0; index<listInputSize;index++){
                if ((listInput[index].value!==" ") && (listInput[index].value!=="")) {
                    queryString+=`${listInput[index].getAttribute("id")}=${listInput[index].value}`;  
                    if (index!==(listInputSize-1)){
                        queryString+="&"
                    }
                }
            }

            if (queryString.endsWith("&")){
                queryString=queryString.slice(0,-1);
            }

            let field_id = $(this).attr('id');

            // let filter_text = $(this).val();
            let filter_text =queryString;

            
            // Don't do anything if field is blank
            if (! filter_text) return;
            
            // Cancel any queued timer 
            clearTimeout(timer);
            
            // Runs after timer delay

            timer = setTimeout(()=> {
                search_obj[field_id] = filter_text;
                search_url = endpoint + '?' + queryString;

                $("#search_url").text("Query to execute :  "+ search_url);
                
                let data = $.getJSON(search_url, data=> {
                    let t = Date.now()
                    let items = [];
                    items.push( `<hr>` );
                    let myJson="";
                    
                    $.each(data, (key, val)=> {
                        myJson=JSON.stringify(val)
                        let myJsonNew=JSON.parse(myJson)
                        let myJsonIndic=myJsonNew.indicators;
                        let myJsonSubfields=myJsonNew.subfields;
                        let myJsonSubfieldsLen=myJsonSubfields.length;
                        items.push(`<div><span class="mt-2 badge badge-secondary"> <h3>Detailed information </h3></span><br>`); 
                        items.push(`<span> Indicators 1: ${myJsonIndic[0]}</span><br>` );
                        items.push(`<span> Indicators 2: ${myJsonIndic[1]}</span><br>`);
                        for (let index=0; index<myJsonSubfieldsLen;index++){
                            items.push(`<span><strong> Subfields Details </strong></span><br>` );
                            items.push(`<span> Code: ${myJsonSubfields[0]["code"]}</span><br>`);
                            items.push(`<span> Value: ${myJsonSubfields[0]["value"]}</span><br>`);
                            items.push(`<span> xref: ${myJsonSubfields[0]["xref"]}</span><br></div>`);
                        }
                        items.push(`<div><span class="mt-2 badge badge-secondary"> <h3>JSON information </h3><br><h6>Double click on the data to select the record </h6></span></div><br>`); 
                        items.push(`<div id="${key}" class="myResult">${myJson}</div>`);
                        items.push(`<hr>`);
                    });

                    $("#authsList").html(items);
                    
                    // include the event behaviour after a double click
                    let myRecup=document.getElementsByClassName("myResult");
                    let myRecupSize =myRecup.length;

                    for (let index0=0;index0<myRecupSize;index0++){
                        myRecup[index0].addEventListener('dblclick', () =>{

                            // display the record inside the editor table
                            $('#modalSearch').modal('hide'); 
                            
                            let myJson=myRecup[index0].innerHTML;
                            let indexSelected=myRecup[index0].getAttribute("id");
                            let myRows=document.getElementsByTagName("TR");
                            let myRowsSize=myRows.length;
                            let myTable0 = document.getElementById("tableNewRecord");
                            let myCheckbox0 = myTable0.getElementsByClassName("myCheckbox");

                            // clean the display
                            for (let index=0;index<myRowsSize;index++){
                                if (index>0){
                                    if (myCheckbox0[index-1].checked) {
                                        let row = myCheckbox0[index-1].parentNode.parentNode.parentNode;
                                        let myId = "divData" + row.rowIndex;
                                        let myIdXref = "divXref" + row.rowIndex;
                                        let myTd = document.getElementById(myId);
                                        let myTdXref = document.getElementById(myIdXref);
                
                                        while (myTd.childElementCount > 1) {
                                            myTd.removeChild(myTd.lastElementChild);
                                        } 
                                        while (myTdXref.childElementCount > 1) {
                                            myTdXref.removeChild(myTdXref.lastElementChild);
                                        }
                                    }
                                }
                            }


                            // browse the table in order to reach the line checked
                            for (let index=0;index<myRowsSize;index++){
                                if (index>0){
                                    if (document.getElementById("checkboxCol"+index).checked==true) {

                                    // Adding TAG value
                                    document.getElementById("tagCol"+index).value=myTag;

                                    // Adding Subfield value
                                    console.log(myJson)
                                    let myData=JSON.parse(myJson)
                                    let myDataSize=myData["subfields"].length;

                                    for (let index1=0;index1<myDataSize;index1++){
                                        if (index1==0){
                                            document.getElementById("code"+index).value=myData["subfields"][index1]["code"];
                                            document.getElementById("value"+index).value=myData["subfields"][index1]["value"];
                                            if (myData["subfields"][index1]["xref"]){
                                                document.getElementById("inputXref"+index).value=myData["subfields"][index1]["xref"];
                                            }else{
                                                document.getElementById("inputXref"+index).value="";
                                            }
                                        }else{

                                            let myBox = document.getElementById("checkboxCol" + index);
                                            myBox.checked = true;
                                            ////////////////////////////// Adding a new line for the subfields
                                          
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
                                                        let myXref = "divXref" + row.rowIndex;
                                                        let myTdXref = document.getElementById(myXref);
                                                        myTdXref.insertAdjacentHTML('beforeend', '<div><input size="8" type="text" placeholder="xref"></div>');
                                
                                                    }
                                                }
                                                if (checkButton == false) {
                                                    divMailHeader.innerHTML = "<div class='alert alert-danger mt-2 alert-dismissible fade show' role='alert'>Please check a tag first!!!</div>";
                                                }
                                            
                                            //////////////////////////////
                                            document.getElementById("divData" + index).lastChild.getElementsByTagName("SELECT")[0].value=myData["subfields"][index1]["code"];
                                            document.getElementById("divData" + index).lastChild.getElementsByTagName("INPUT")[0].value=myData["subfields"][index1]["value"];
                                            if (myData["subfields"][index1]["xref"]){
                                                document.getElementById("divXref" + index).lastChild.getElementsByTagName("INPUT")[0].value=myData["subfields"][index1]["xref"];
                                            }else{
                                                document.getElementById("divXref" + index).lastChild.getElementsByTagName("INPUT")[0].value="";
                                            }
                                            myBox.checked = false;
                                        }
                                    }


                                }
                            }
                                
                            }
                        });
                    }

                    $("#nb_results").text("Duration :  "+ (Date.now() - t) + ' seconds');
                });
            }, 800);
        }



        // create the record form
        createFrameNewRecord() {

            this.tableNewRecordCreated = true;

            //--->create data table > start
            var tbl = '';
            //table-responsive table-sm
            tbl += '<table id="tableNewRecord" class="table table-hover table-responsive" style="table-layout: fixed; width: 100%; height:500px">'
 //           tbl += '<table id="tableNewRecord">'

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
            tbl += '<td><div style="display: table;" class="checkClass mt-0" col_name="tagCol" contenteditable="true"> <input class="myCheckbox" id="checkboxCol' + row_id + '" type="checkbox" placeholder="Tag" maxlength="3" size="3"></div></td>';
            tbl += '<td><div style="display: table;" class="tagClass mt-0" col_name="tagCol" contenteditable="true"> <input id="tagCol' + row_id + '" type="text"  min="000" max="999" placeholder="Tag" maxlength="3" size="3"></div></td>';
            tbl += '<td><div style="display: table;" class="indClass" col_name="ind1Col" contenteditable="true"><select class="mt-1" id="ind1Col' + row_id + '"><option value=" "> </option><option value="N/A">N/A</option> <option value="0">0</option> <option value="1">1</option> <option value="2">2</option> <option value="3">3</option> <option value="4">4</option> <option value="5">5</option> <option value="6">6</option> <option value="7">7</option> <option value="8">8</option><option value="9">9</option></select></div></td>';
            tbl += '<td><div style="display: table;" class="indClass" col_name="ind2Col" contenteditable="true"><select class="mt-1" id="ind2Col' + row_id + '"><option value=" "> </option><option value="N/A">N/A</option> <option value="0">0</option> <option value="1">1</option> <option value="2">2</option> <option value="3">3</option> <option value="4">4</option> <option value="5">5</option> <option value="6">6</option> <option value="7">7</option> <option value="8">8</option><option value="9">9</option></select></div></td>';
            tbl += '<td><div id="divData' + row_id + '" style="display: table;" class="valueClass" col_name="valueCol" contenteditable="true"><div><select class="mr-2" id="code' + row_id + '"><option value=" "> </option><option value="N/A">N/A</option> <option value="a">a</option> <option value="b">b</option> <option value="c">c</option> <option value="d">d</option> <option value="e">e</option> <option value="f">f</option> <option value="g">g</option> <option value="h">h</option> <option value="i">i</option> <option value="j">j</option> <option value="k">k</option> <option value="l">l</option> <option value="m">m</option> <option value="n">n</option> <option value="o">o</option> <option value="p">p</option> <option value="q">q</option> <option value="r">r</option> <option value="s">s</option> <option value="t">t</option> <option value="u">u</option> <option value="v">v</option><option value="w">w</option> <option value="x">x</option> <option value="y">y</option><option value="z">z</option><option value="0">0</option><option value="1">1</option><option value="2">2</option><option value="3">3</option><option value="4">4</option><option value="5">5</option><option value="6">6</option><option value="7">7</option><option value="8">8</option><option value="9">9</option></select><input size="70" id="value' + row_id + '" type="text" placeholder="Value"></div></div></td>';
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
                divNewRecord.style.overflowY="scroll";
                divNewRecord.style.height="650px";
            }

            this.manageDisplayButton();

            divNewRecord.innerHTML = tbl;
            this.appendChild(divNewRecord);

            // adding the logic to change the value of the list of template according the value selected
            if (document.getElementById("selectTypeRecord")){
                let selectTypeRecord = document.getElementById("selectTypeRecord")
				this.loadTemplate(selectTypeRecord.value === "bibs" ? "bibs" : "auths");
				
                selectTypeRecord.addEventListener("change", () => {	
		            this.loadTemplate(selectTypeRecord.value === "bibs" ? "bibs" : "auths");
				})
            }   
            

            // adding the logic to display the data when you select a template
            if (document.getElementById("selectListTemplate")){
                let selectListTemplate=document.getElementById("selectListTemplate");
                selectListTemplate.addEventListener("change", () => {
                    this.displayFullRecordEditModeFromTemplate(selectTypeRecord.value);
                })
            }

        this.implementDblClick()
  
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
                cell0.innerHTML = '<div style="display: table;" class="checkClass mt-0" col_name="tagCol" contenteditable="true"> <input class="myCheckbox" id="checkboxCol' + row_id + '" type="checkbox" placeholder="Tag" maxlength="3" size="3"></div>';
                cell1.innerHTML = '<div style="display: table;" class="tagClass mt-0" col_name="tagCol" contenteditable="true"> <input id="tagCol' + row_id + '" type="text" min="001" max="999" placeholder="Tag" maxlength="3" size="3"></div>';
                cell2.innerHTML = '<div style="display: table;" class="indClass" col_name="ind1Col" contenteditable="true"><select class="mt-1" id="ind1Col' + row_id + '"><option value=" "> </option><option value="N/A">N/A</option> <option value="0">0</option> <option value="1">1</option> <option value="2">2</option> <option value="3">3</option> <option value="4">4</option> <option value="5">5</option> <option value="6">6</option> <option value="7">7</option> <option value="8">8</option><option value="9">9</option></select></div>';
                cell3.innerHTML = '<div style="display: table;" class="indClass" col_name="ind2Col" contenteditable="true"><select class="mt-1" id="ind2Col' + row_id + '"><option value=" "> </option><option value="N/A">N/A</option> <option value="0">0</option> <option value="1">1</option> <option value="2">2</option> <option value="3">3</option> <option value="4">4</option> <option value="5">5</option> <option value="6">6</option> <option value="7">7</option> <option value="8">8</option><option value="9">9</option></select></div>';
                cell4.innerHTML = '<div id="divData' + row_id + '" style="display: table;" class="valueClass" col_name="valueCol" contenteditable="true"><div><select class="mr-2" id="code' + row_id + '"><option value=" "> </option><option value="N/A">N/A</option><option value="a">a</option> <option value="b">b</option> <option value="c">c</option> <option value="d">d</option> <option value="e">e</option> <option value="f">f</option> <option value="g">g</option> <option value="h">h</option> <option value="i">i</option> <option value="j">j</option> <option value="k">k</option> <option value="l">l</option> <option value="m">m</option> <option value="n">n</option> <option value="o">o</option> <option value="p">p</option> <option value="q">q</option> <option value="r">r</option> <option value="s">s</option> <option value="t">t</option> <option value="u">u</option> <option value="v">v</option><option value="w">w</option> <option value="x">x</option> <option value="y">y</option><option value="z">z</option><option value="0">0</option><option value="1">1</option><option value="2">2</option><option value="3">3</option><option value="4">4</option><option value="5">5</option><option value="6">6</option><option value="7">7</option><option value="8">8</option><option value="9">9</option></select><input size="70" id="value' + row_id + '" type="text" placeholder="Value"></div></div>';
                cell5.innerHTML = '<div id="divXref' + row_id + '" ><div><input size="8" id="inputXref' + row_id + '" type="text" placeholder="xref"></div></div>';
                this.updateNumberOfLineRecord();
                this.implementDblClick();

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
                        let myXref = "divXref" + row.rowIndex;
                        let myTdXref = document.getElementById(myXref);
                        myTdXref.insertAdjacentHTML('beforeend', '<div><input size="8" type="text" placeholder="xref"></div>');

                    }
                }
                if (checkButton == false) {
                    divMailHeader.innerHTML = "<div class='alert alert-danger mt-2 alert-dismissible fade show' role='alert'>Please check a tag first!!!</div>";
                }
            } else {
                divMailHeader.innerHTML = "<div class='alert alert-danger mt-2 alert-dismissible fade show' role='alert'>Please create a new the record first or Edit an old record!!!</div>";
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
                        let myIdXref = "divXref" + row.rowIndex;
                        let myTd = document.getElementById(myId);
                        let myTdXref = document.getElementById(myIdXref);

                        if (myTd.childElementCount > 1) {
                            myTd.removeChild(myTd.lastElementChild);
                        } else {
                            divMailHeader.innerHTML = "<div class='alert alert-danger mt-2 alert-dismissible fade show' role='alert'>Impossible to remove this line!!!</div>";
                        }
                        if (myTdXref.childElementCount > 1) {
                            myTdXref.removeChild(myTdXref.lastElementChild);
                        } else {
                            divMailHeader.innerHTML = "<div class='alert alert-danger mt-2 alert-dismissible fade show' role='alert'>Impossible to remove this line!!!</div>"
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

            //console.log(data);

            alert(data)

            // Call the method to create the record
            this.createRecord(this.prefixUrl + "marc/" + typeRecord, data)

            // Restauring the init edit mode
            this.typeEditMode = "INIT"

        }

        // Update at the Full Record level
        generateDataFullRecordToUpdateNewVersion(type) {

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

            // Retrieving the checkbox value
            let checkBoxTemplateValue=document.getElementById("checktemplate");
            if (checkBoxTemplateValue.checked === true) {
                let templateName=prompt("Please enter the name of the template");
                marcRecords["name"] = templateName;
                type=3;
            }

            // Retrieving the table
            const myTable = document.getElementById("tableNewRecord");

            // Loop for the leaders fields
            for (var i = 1, row; row = myTable.rows[i]; i++) {

                // Retrieving the leader data
                // Here we will just fill the tagRecord with the value of the divData 
                if (this.leaderList.indexOf(document.getElementById("tagCol" + i).value) !== -1) {
                    
                    // cloning case 
                    if (type !== 2) {
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

                        if (myXrefData[j].value) {
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

            // update
            if (type === 1) {
                //  update the Data
                let res = this.updateFullRecord(this.prefixUrl + "marc/" + typeRecord + "/records/" + this.idToUpdate, data);
            }

            // create
            if (type === 0) {
                //  save the data
                typeRecord = document.getElementById("selectTypeRecord").value;
                this.createRecord(this.prefixUrl + "marc/" + typeRecord + "/records", data)
            }

            // clone
            if (type === 2) {
                //  clone the data
                typeRecord = this.recordType;
                this.cloneRecord(this.prefixUrl + "marc/" + typeRecord + "/records", data)
            }

            // tempate 
            if (type === 3) {
                //  update the Data
                let recup = this.getPrefix() + "marc/" + document.getElementById("selectTypeRecord").value + "/templates";
                this.createRecord(recup,data);
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

            // Retrieving the value of the type of Record
            const typeRecord = this.typeRecordToUpdate;

            // Saving the Data
            let data = mySpecialRecord;

            //console.log(data)

            // cleaning 

            this.typeEditMode = "INIT"

            this.updateFullRecord(this.prefixUrl + "marc/" + typeRecord + "/records/" + this.idToUpdate, data);
            //this.updateRecord(this.prefixUrl + typeRecord + "/1", data) not good

            this.typeRecordToUpdate = "";
            this.idToUpdate = "";

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
                        let myXref = 0;
                        if (parseInt(myXrefData[j].value.trimEnd(), 10) > 0) {
                            myXref = parseInt(myXrefData[j].value.trimEnd(), 10);
                        }

                        console.log("la valeur est  :" + myXref)


                        // Definition of the dict to store the subfields

                        // xref
                        if (myXref !== 0) {
                            if (j === (lenMyData - 1)) {
                                myListOfSubField = myListOfSubField + `{"code": "${myCode}","value": "${myValue}","xref": ${myXref}}`;
                            } else {
                                myListOfSubField = myListOfSubField + `{"code": "${myCode}","value": "${myValue}","xref": ${myXref}}` + ",";
                            }
                        }

                        // no xref
                        if (myXref === 0) {
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

            //var myUrl1=this.prefixUrl + this.recordType + "/" + this.idToUpdate +"/fields/" + this.tagRecordToUpdate +"/"+ (this.indexRecordToUpdate-1)+"?format=jmarcnx";
            var myUrl1 = this.prefixUrl + "marc/" + this.recordType + "/records/" + this.idToUpdate + "/fields/" + this.tagRecordToUpdate + "/" + (this.indexRecordToUpdate - 1);

            this.updateTagRecord(myUrl1, data)

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
            return this.getAttribute('url');
        }

        // get the API URL Prefix
        getPrefix() {
            var apiPrefix = this.getAttribute('prefix')
            this.savePrefix=apiPrefix;

            if (apiPrefix) {
                return apiPrefix;
            } else {
                let msg = "API base URL must be set as attribute 'prefix' of the HTML component"
                window.alert(msg)
                throw (msg)
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
            divHeader.className = "mt-1 mb-1 text-left text-success";

            // Adding the div to the page
            this.appendChild(divHeader);

            // create the div for the data
            let divContentHeader = document.createElement("DIV");
            divContentHeader.id = "divContentHeader";
            // adding the css for always display when scrolling
            divContentHeader.style.position="sticky";
            divContentHeader.style.top="10px";
            this.appendChild(divContentHeader);

            // create the div for the mail
            let divMailHeader = document.createElement("DIV");
            divMailHeader.id = "divMailHeader";
            this.appendChild(divMailHeader);

            if (this.loggedIn) {

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
                    // deactivate the styling for the divContent

                    divContent.style.overflowY="";
                    divContent.style.height="";

                    this.typeEditMode = "CREATERECORD"
                    let divRecordType = document.getElementById("divRecordType");

                // create the dropdown list for selecting the type of record    
                    //this.recordType = this.getRecordType(this.url)
                    console.log(this.recordType)
                    let recordTypeSelectElement = document.createElement("select");
                    recordTypeSelectElement.className = "custom-select";
                    recordTypeSelectElement.id = "selectTypeRecord";
                    recordTypeSelectElement.style = "width: 300px;";

                    let bibsOption = document.createElement("option");
                    bibsOption.value = "bibs";
                    bibsOption.innerText = "Bibliographic record";

                    let authsOption = document.createElement("option");
                    authsOption.value = "auths";
                    authsOption.innerText = "Authority record";

                    if(this.recordType == "bibs") {
                        bibsOption.selected = true
                    } else if (this.recordType == "auths") {
                        authsOption.selected = true
                    }
                    
                    recordTypeSelectElement.appendChild(bibsOption);
                    recordTypeSelectElement.appendChild(authsOption);
                    //divContentHeader.appendChild(recordTypeSelectElement);

                    /*
                    `<select class="custom-select" id="selectTypeRecord" style="width: 300px;">
                            
                    <option value="bibs" selected>Bibliographic record</option>
                    <option value="auths">Authority Record</option>
            </select>`
                    */

                    if (divRecordType == null) {
                        let myHtml = document.createElement("DIV");
                        myHtml.appendChild(recordTypeSelectElement)
                        myHtml.id = "divRecordType"
                        myHtml.className = "mr-2 mb-2";
                        divContentHeader.appendChild(myHtml);
                    } else if (divRecordType !== null) {
                        divRecordType.innerHTML = ''
                        console.log(recordTypeSelectElement)
                        divRecordType.appendChild(recordTypeSelectElement)
                    }

                    // How do we make the record type selected based on divRecordType?
                    /*
                    if (divRecordType !== null) {
                        console.log(recordTypeSelectElement)
                        divRecordType.innerHTML = recordTypeSelectElement
                    }
                    */

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

                // save record button

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
                    // deactivate the styling for the divContent

                    divContent.style.overflowY="";
                    divContent.style.height="";
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
                // myHtml.innerHTML = `<select class="custom-select" id="selectTypeRecord" style="width: 300px;">
                //                 <option value="bibs" selected>Bibliographic record</option>
                //                 <option value="auths">Authority Record</option>
                //         </select>`
                myHtml.id = "divRecordType"
                myHtml.className = "mr-2 mb-2";

                let selectTypeRecord = document.createElement("select");
                selectTypeRecord.id = "selectTypeRecord";

                let option = document.createElement("option");
                option.value = "bibs";
                option.text = "Bibliographic record";
                selectTypeRecord.appendChild(option);

                let option1 = document.createElement("option");
                option1.value = "auths";
                option1.text = "Authority record";
                selectTypeRecord.appendChild(option1);   
                
                selectTypeRecord.className="custom-select"
                myHtml.appendChild(selectTypeRecord);           
                divContentHeader.appendChild(myHtml);

                //Adding the dropdown list to List the templates available
                let myTemplateList = document.createElement("DIV");
                // myTemplateList.innerHTML = `<select class="custom-select" id="selectListTemplate" style="width: 300px;">
                //                 <option value="" selected>Option1</option>
                //         </select>`
                myTemplateList.id = "divListTemplate"
                myTemplateList.className = "mr-2 mb-2";
                
                // create the select for the template
                let selectListTemplate = document.createElement("select");
                selectListTemplate.id = "selectListTemplate";
                selectListTemplate.className="custom-select";
                selectListTemplate.style.width="300px"

                myTemplateList.appendChild(selectListTemplate);
                divContentHeader.appendChild(myTemplateList);

                // Adding a checkbox to define if the record as to be a template
                let myCheckTemplate = document.createElement("DIV");
                myCheckTemplate.innerHTML = `  <div class="form-group form-check">
                <input type="checkbox" class="form-check-input" id="checktemplate">
                <label class="form-check-label" for="exampleCheck1">Do you want to save this record as a template?</label>
                </div>`
                myCheckTemplate.id = "divCheckTemplate"
                myCheckTemplate.className = "mr-2 mt-4";
                divContentHeader.appendChild(myCheckTemplate);

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
        // display the fullRecord when you select the template
        async displayFullRecordEditModeFromTemplate(myCollection) {

            let myString = this.getPrefix() + "marc/" + myCollection + "/templates/" + document.getElementById("selectListTemplate").value;
			
			console.log(document.getElementById("selectListTemplate").value)
			
            let response = await fetch(myString);
            if (response.ok) {
                   
                let json = await response.json();
                let resultsList = Object.keys(json["data"]);
                let results=json["data"]
                resultsList=resultsList.sort()
                console.log(resultsList)
                let sizeResults = (resultsList.length - 1);

                //check if the divNewRecord is already displayed
                let myDiv = document.getElementById("divNewRecord");
                if (myDiv) {
                    this.removeDiv(myDiv);
                    this.tableNewRecordCreated = false;
                    this.rowLineNewRecord = 0;
                }

                let sizeTotal=0;

                // sizeTotal of the array 
                for (let indexArray = 0; indexArray < sizeResults; indexArray++) {
                    sizeTotal+=results[resultsList[indexArray]].length
                }

                // Clean and rebuild the table
                this.createFrameNewRecord()
            
                let indexList=0;

                for (let indexArray = 1; indexArray <= sizeTotal; indexArray++) {

                    if ((parseInt(resultsList[indexList])<10) && (resultsList[indexList]!=="_id") && (resultsList[indexList]!=="undefined")){
                        // leader management

                        // TAG
                        document.getElementById("tagCol" + indexArray).value = resultsList[indexList];

                        // IND1
                        document.getElementById("ind1Col" + indexArray ).value = "N/A";

                        // IND2
                        document.getElementById("ind2Col" + indexArray ).value = "N/A";

                        // Code
                        document.getElementById("code" + indexArray ).value = "N/A";

                        // Value
                        document.getElementById("value" + indexArray ).value = results[resultsList[indexList]];
                        
                    
                    }

                    if (resultsList[indexList]>=10 && (resultsList[indexList]!=="_id") && (resultsList[indexList]!=="undefined"))  {
                        // TAG
                        document.getElementById("tagCol" + indexArray).value = resultsList[indexList];       
                        
                        // retrieve size of the array
                        let sizeData1=results[resultsList[indexList]].length;

                        // Loop data1
                        for (let indexRecord = 0; indexRecord < sizeData1; indexRecord++) {

                            // Adding the indicators
                            document.getElementById("tagCol" + indexArray).value = resultsList[indexList];  
                            document.getElementById("ind1Col" + indexArray).value = results[resultsList[indexList]][indexRecord]["indicators"][0]
                            document.getElementById("ind2Col" + indexArray).value = results[resultsList[indexList]][indexRecord]["indicators"][1]

                            // Management of the subfields
                            
                            // retrieve size of the array
                            let sizeSubfields= results[resultsList[indexList]][indexRecord]["subfields"].length

                            for (let indexSubfields = 0; indexSubfields  < sizeSubfields; indexSubfields++) {

                                if (indexSubfields===0) {
                                    document.getElementById("code" + indexArray).value=results[resultsList[indexList]][indexRecord]["subfields"][indexSubfields]["code"]
                                    document.getElementById("value" + indexArray).value = results[resultsList[indexList]][indexRecord]["subfields"][indexSubfields]["value"]
                                    if (results[resultsList[indexList]][indexRecord]["subfields"][indexSubfields]["xref"]){
                                        document.getElementById("inputXref" + indexArray).value = results[resultsList[indexList]][indexRecord]["subfields"][indexSubfields]["xref"]
                                    } else {
                                        document.getElementById("inputXref" + indexArray).value = "";
                                    }

                                } else {
                                    let myBox = document.getElementById("checkboxCol" + indexArray);
                                    myBox.checked = true;
                                    this.addNewSubFieldLine();
                                    document.getElementById("divData" + indexArray).lastChild.getElementsByTagName("SELECT")[0].value=results[resultsList[indexList]][indexRecord]["subfields"][indexSubfields]["code"];
                                    document.getElementById("divData" + indexArray).lastChild.getElementsByTagName("INPUT")[0].value=results[resultsList[indexList]][indexRecord]["subfields"][indexSubfields]["value"];
                                    if (results[resultsList[indexList]][indexRecord]["subfields"][indexSubfields]["xref"]){
                                        document.getElementById("divXref" + indexArray).lastChild.getElementsByTagName("INPUT")[0].value=results[resultsList[indexList]][indexRecord]["subfields"][indexSubfields]["xref"];
                                    }else{
                                        document.getElementById("divXref" + indexArray).lastChild.getElementsByTagName("INPUT")[0].value="";
                                    }
                                    myBox.checked = false;

                                }

                            }                            

                            // Management of the index of the whole array
                            if (indexRecord!==sizeData1-1){
                                indexArray+=1;
                                this.addNewLineRecord();
                            }
                            

                        }
                        
                    }

                    indexList+=1;
                    if (indexArray != sizeTotal) {
                        this.addNewLineRecord();
                    }
                }

            }
            else 
            {
                return divMailHeader.innerHTML = "<div class='alert alert-danger mt-2 alert-dismissible fade show' role='alert'>Something is wrong, HTTP-Error number : " + response.status + "</div>";
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
                                    let myXref = 0

                                    //console.log("la valeur de y est : " + y)
                                    if (y === 0) {
                                        myCode = document.getElementById("code" + myLine);
                                        myCode.value = recupSubFieldValues[y].charAt(1).trim();

                                        // xref Management if there is a value
                                        if (recupSubFieldValues[y].includes("@@@")) {

                                            let dataX = recupSubFieldValues[y].substring(2).split("@@@");
                                            myValue = document.getElementById("value" + myLine);
                                            myValue.value = dataX[0].trim();
                                            myXref = document.getElementById("inputXref" + myLine);
                                            myXref.value = parseInt(dataX[1].trim());
                                        } else {
                                            myValue = document.getElementById("value" + myLine);
                                            myValue.value = recupSubFieldValues[y].substring(2).trim();
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
                                      
                                        if (recupSubFieldValues1[1].includes("@@@")) {
                                            let dataX = recupSubFieldValues1[1].split("@@@");
                                            console.log("la valeur de dataX est : " + dataX)
                                            myValue.value = dataX[0].trim();
                                            myXref = document.getElementById("divXref" + i).lastChild.getElementsByTagName("INPUT")[0];
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

        // function initiating the history two files display component
        initHistoryTwoFileDisplay(url1,url2){
            return  `<double-record-display urls="${url1},${url2}"></double-record-display>`
        }

        // function generating the record with the value from the API
        displayDataFromApi(myDataList, myDataSize, myData) {

            let that=this;

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

            // Adding the last update value
            if (myData["updated"]!==""){
                divDetail.innerHTML+="<br><span class='text-left text-success'>Last update:  " + myData["updated"] + "</span>"
            }

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
                // adding styling for scrollbar
                divContent.style.overflowY="scroll";
                divContent.style.height="650px";
                

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
            if (this.loggedIn) {
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
            displayMarc.innerHTML = `<a href="${this.prefixUrl + 'marc/' + this.recordType + "/records/" + this.getRecordID()}?format=mrk" target="_blank" aria-pressed="true">MARC format</a>`
            divContent.appendChild(displayMarc);

            let displayXML = document.createElement("A");
            displayXML.id = "btnDisplayXML";
            displayXML.innerHTML = `<a class="ml-2" href="${this.prefixUrl + 'marc/' + this.recordType + "/records/" + this.getRecordID()}?format=xml" target="_blank" aria-pressed="true">XML format</a>`
            divContent.appendChild(displayXML);

            // create the hr 
            let hrx = document.createElement("HR");
            divContent.appendChild(hrx);

            // create the files framework
            if (this.filesAvailable.length > 0) {
                // adding the logic
                let myHeader = document.createElement("H5");
                myHeader.innerHTML = "<span class='badge badge-pill badge-success'>" + this.filesAvailable.length + "</span> file(s) available.";
                let myTable = document.createElement("TABLE");
                myTable.className = "table table-striped"
                myTable.innerHTML += "<div>"
                myTable.innerHTML += "<table><thead> <tr><th>Language(s)</th><th>Link(s) (Open in New Tab)</th><th>Download(s)</th></tr></thead><tbody>";
                let i;
                let myTableContent = "";
                for (i = 0; i < this.filesAvailable.length; i++) {


                    // just a test
                    console.log("the data is : "+this.filesAvailable[i]['id'])


                    // creation of the line
                    let myTr = document.createElement("TR")

                    //creation of the first column
                    let myTdLangs = document.createElement("TD")
                    myTdLangs.innerText = this.filesAvailable[i]['language']

                    // creation of the second column
                    let myTdLinks = document.createElement("TD")
                    let myA_newTab = document.createElement("A")
                    myA_newTab.href = this.filesAvailable[i]['url'] + "?action=open"
                    myA_newTab.target = "_blank"
                    myA_newTab.innerHTML ='<span class="badge badge-secondary text-center"><i class="fas fa-file"></i></span>'
                    myTdLinks.appendChild(myA_newTab)

                    // creation of the third column
                    let myTdDownloads = document.createElement("TD")
                    let mySpan = document.createElement("A")

                    mySpan.href = this.filesAvailable[i]['url']  + "?action=download"
                    console.log("value : "+ this.filesAvailable[i]['url'])

                    mySpan.target = "_blank"
                    mySpan.innerHTML = '<span class="badge badge-secondary text-center"><i class="fas fa-cloud-download-alt"></i></span>'
                    myTdDownloads.appendChild(mySpan)          
                    
                    // assignments  
                    myTr.appendChild(myTdLangs)
                    myTr.appendChild(myTdLinks)
                    myTr.appendChild(myTdDownloads)
                    myTable.appendChild(myTr)
                }
                myTable.innerHTML += myTableContent + "</tbody></table></div>"
                divContent.appendChild(myHeader);
                divContent.appendChild(myTable);

            }

            // adding a new hr 
            let hr2 = document.createElement("HR");
            divContent.appendChild(hr2);

            // adding the space for the history feature
            let btnHistoryRecord = document.createElement("BUTTON");
            btnHistoryRecord.className = "btn btn-success mr-2";
            btnHistoryRecord.id = "btnHistoryRecord";
            btnHistoryRecord.innerHTML = "History of this record";

            btnHistoryRecord.setAttribute('data-toggle', 'modal');
            btnHistoryRecord.setAttribute('data-target', '#myModal');

            divContent.appendChild(btnHistoryRecord);

            // adding the logic to delete a record
            btnHistoryRecord.addEventListener("click", () => {
                if (this.history.length===0){
                    alert("No history available for this record")
                }
                else
                {
                    document.getElementById("modalTitle").innerHTML = "<div class='alert alert-success mt-2' role='alert'>History of the record</div>";
                    document.getElementById("modalContent").innerHTML =""
                    for (let i = 0; i < this.history.length; i++) {
                        //document.getElementById("modalContent").innerHTML += "<a href=" + this.history[i]+" target=_blank>"+this.history[i]+"</a><br>"; 
                        document.getElementById("modalContent").innerHTML += "<div class=history> " + this.history[i] + " </div>";
                    }
                    // creation of the event on click
                        let myElement=document.getElementsByClassName("history")
                        //alert(myElement.length)
                        for (let i = 0; i < myElement.length; i++) {
                            myElement[i].addEventListener('click', (event) => {
                            this.secondRecord=event.target.innerText

                            //find the component
                            vm.urls=[]
                            vm.urls.push(this.firstRecord.toString())
                            vm.urls.push(this.secondRecord.toString())
                            vm.displayData()
                            vm.visible=true
                            
                            // close the modal
                            $("#myModal").modal('hide');

                            });
                          }
    
                    let myButton = document.getElementById("modalButton");
                    myButton.style.display="none"
                }
            })

            // adding a new hr 
            let hr3 = document.createElement("HR");
            divContent.appendChild(hr3);

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
            // thead.className = "thead-light";
            // table.className = "table-sm table-responsive ";
            table.id = "tableData"
            // table.style.height="100px"
            // table.style.overflowY="auto"

            //table.style.tableLayout="auto"
            


            // add the values of the columns
            th1.innerHTML = "<span class='badge badge-secondary'> TAG </span>";
            th2.innerHTML = "<span class='badge badge-secondary'> IND1 </span>";
            th3.innerHTML = "<span class='badge badge-secondary'> IND2 </span>";
            th4.innerHTML = "<span class='badge badge-secondary'> VALUE </span>";
            if (this.loggedIn) {
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
                    if (this.loggedIn) {
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
                                th4.innerHTML += "<span class='text-primary'>$" + myData[myDataList[i]][j]["subfields"][k]["code"] + " </span> " + " " + myData[myDataList[i]][j]["subfields"][k]["value"] + "  <span class='text-success'>@@@" + myData[myDataList[i]][j]["subfields"][k]["xref"] + " </span> " + "|";
                            } else {
                                th4.innerHTML += "<span class='text-primary'>$" + myData[myDataList[i]][j]["subfields"][k]["code"] + " </span> " + " " + myData[myDataList[i]][j]["subfields"][k]["value"] + " |";
                            }

                        }

                        if (this.loggedIn) {

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
                                        let myXref = 0;

                                        if (i === 0) {
                                            myCode = document.getElementById("code" + myLine);
                                            myCode.value = recupSubFieldValues[i].charAt(1).trim();

                                            // xref Management if there is a value
                                            if (recupSubFieldValues[i].includes("@@@")) {

                                                let dataX = recupSubFieldValues[i].substring(2).split("@@@");
                                                myValue = document.getElementById("value" + myLine);
                                                myValue.value = dataX[0].trim();
                                                myXref = document.getElementById("inputXref" + myLine);
                                                myXref.value = parseInt(dataX[1].trim());
                                            } else {
                                                myValue = document.getElementById("value" + myLine);
                                                myValue.value = recupSubFieldValues[i].substring(2).trim();
                                            }

                                        } else {

                                            myBox.checked = true;
                                            this.addNewSubFieldLine();

                                            myCode = document.getElementById("divData1").lastChild.getElementsByTagName("SELECT")[0];
                                            myCode.value = recupSubFieldValues[i].charAt(1).trim();

                                            myValue = document.getElementById("divData1").lastChild.getElementsByTagName("INPUT")[0];
                                            // xref Management if there is a value
                                            if (recupSubFieldValues[i].includes("@@@")) {

                                                let dataX = recupSubFieldValues[i].substring(2).split("@@@");
                                                myValue.value = dataX[0].trim();
                                                myXref = document.getElementById("divXref1").lastChild.getElementsByTagName("INPUT")[0];
                                                myXref.value = parseInt(dataX[1].trim());
                                            } else {
                                                myValue.value = recupSubFieldValues[i].substring(2).trim();
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
            this.createSearchModalForm();
            this.createHeaderComponent();
            if (this.getUrlAPI()) {
                this.getDataFromApi(this.getUrlAPI());
                this.getRecordType(this.getUrlAPI());
            } else {
                let btn = document.getElementById("btnCreateNewRecord")
                btn.click()
            }
        }

        disconnectedCallback() {};

        attributeChangedCallback(attrName, oldVal, newVal) {};

    }

    // Define the new element
    customElements.define('marc-record', MarcRecord);