class Checkbook
{
    element;
    #database;
    
    constructor(database)
    {
        this.element = document.createElement("checkbook");
        this.element.innerHTML = 
        `
            <table>
                <thead>
                    <tr>
                        <th>Date</th>
                        <th>Code</th>
                        <th>Description</th>
                        <th>Reconcile</th>
                        <th>Debit (+)</th>
                        <th>Credit (-)</th>
                        <th>Balance</th>
                        <th>Edit/Save</th>
                    </tr>
                </thead>
                <tbody>
                </tbody>
            </table>
        `;
        this.#database = database;
    }

    update()
    {
        let tbody = this.element.querySelector("tbody");
        tbody.innerHTML = "";

        return new Promise
        (
            (resolve, reject) =>
            {
                let balance = 0.0;
                let transaction = this.#database.transaction("entry", "readonly");
                let entryStore = transaction.objectStore("entry");
                let dateIndex = entryStore.index("date");

                dateIndex.openCursor().addEventListener
                (
                    "success",
                    (event) =>
                    {
                        const cursor = event.target.result;
                        if(cursor)
                        {
                            balance += (cursor.value.debit || 0) - (cursor.value.credit || 0);

                            let tr = document.createElement("tr");
                            tr.primaryKey = cursor.primaryKey;
                            tr.entry = cursor.value;
                            tr.balance = balance;
                            tr.innerHTML = 
                            `
                                <td>${cursor.value.date || ""}</td>
                                <td>${cursor.value.code || ""}</td>
                                <td>${cursor.value.description || ""}</td>
                                <td>${cursor.value.reconcile || false ? "R" : ""}</td>
                                <td>$${parseFloat(cursor.value.debit || 0).toFixed(2)}</td>
                                <td>$${parseFloat(cursor.value.credit || 0).toFixed(2)}</td>
                                <td>$${balance.toFixed(2)}</td>
                                <td><button>Edit</button></td>
                            `;
                            tr.children[7].children[0].addEventListener("click", (event) => this.editEntry(tr));
                            tbody.appendChild(tr);
                            cursor.continue();
                        }
                    }   
                );

                transaction.addEventListener("complete", (event) => resolve(this.newEntry()));
                transaction.addEventListener("error", (event) => reject(event.target.error));
            }
        );
    }

    newEntry()
    {
        return new Promise
        (
            (resolve, reject) =>
            {
                let tr = document.createElement("tr");
                tr.innerHTML =
                `
                    <td><input type="date"/></td>
                    <td><select><option value=""></option></select></td>
                    <td><input type="text"/></td>
                    <td><input type="checkbox"/></td>
                    <td><input type="number"/></td>
                    <td><input type="number"/></td>
                    <td><button>Add</button></td>
                    <td></td>
                `;
                tr.children[6].children[0].addEventListener
                (
                    "click",
                    (event) =>
                    {
                        let newEntry = 
                        {
                            date: tr.children[0].children[0].value || "",
                            code: tr.children[1].children[0].value || "",
                            description: tr.children[2].children[0].value || "",
                            reconcile: tr.children[3].children[0].checked || false,
                            debit: parseFloat(tr.children[4].children[0].value || 0),
                            credit: parseFloat(tr.children[5].children[0].value || 0),
                        };
                        this.recordEntry(newEntry);
                    }
                );

                let transaction = this.#database.transaction("group", "readonly");
                let groupStore = transaction.objectStore("group");

                groupStore.openCursor().addEventListener
                (
                    "success",
                    (event) =>
                    {
                        const cursor = event.target.result;
                        if(cursor)
                        {
                            tr.children[1].children[0].innerHTML += `<option value="${cursor.value.code}">${cursor.value.code}</option>`;
                            cursor.continue();
                        }
                    }
                );

                transaction.addEventListener("complete", (event) => resolve(this.element.querySelector("tbody").appendChild(tr)));
                transaction.addEventListener("error", (event) => reject(event.target.error));
                
            }
        );
    }

    editEntry(tr)
    {
        return new Promise
        (
            (resolve, reject) =>
            {
                if(tr !== undefined && tr.primaryKey !== undefined)
                {
                    tr.innerHTML = 
                    `
                        <td><input type="date" value="${tr.entry.date || ""}"/></td>
                        <td><select><option value=""></option></select></td>
                        <td><input type="text" value="${tr.entry.description || ""}"/></td>
                        <td><input type="checkbox"/></td>
                        <td><input type="number" value="${tr.entry.debit || 0}"/></td>
                        <td><input type="number" value="${tr.entry.credit || 0}"/></td>
                        <td><button>Delete</button></td>
                        <td><button>Save</button></td>
                    `;
                    tr.children[3].children[0].checked = tr.entry.reconcile || false;
                    tr.children[6].children[0].addEventListener("click", (event) => this.deleteEntry(tr.primaryKey));
                    tr.children[7].children[0].addEventListener
                    (
                        "click",
                        (event) =>
                        {
                            let newEntry =
                            {
                                date: tr.children[0].children[0].value || "",
                                code: tr.children[1].children[0].value || "",
                                description: tr.children[2].children[0].value || "",
                                reconcile: tr.children[3].children[0].checked,
                                debit: parseFloat(tr.children[4].children[0].value || 0),
                                credit: parseFloat(tr.children[5].children[0].value || 0),
                            };
                            this.putEntry(newEntry, tr.primaryKey);
                        }
                    );

                    let transaction = this.#database.transaction("group", "readonly");
                    let groupStore = transaction.objectStore("group");

                    groupStore.openCursor().addEventListener
                    (
                        "success",
                        (event) =>
                        {
                            const cursor = event.target.result;
                            if(cursor)
                            {
                                let option = document.createElement("option");
                                option.innerHTML = cursor.value.code;
                                option.value = cursor.value.code;
                                option.selected = tr.entry.code === cursor.value.code;
                                tr.children[1].children[0].appendChild(option);
                                cursor.continue();
                            }
                        }
                    );
                    
                    transaction.addEventListener("complete", (event) => resolve());
                    transaction.addEventListener("error", (event) => reject(event.target.error));
                }
            }
        );
    }

    recordEntry(newEntry)
    {
        return new Promise
        (
            (resolve, reject) =>
            {
                let transaction = this.#database.transaction("entry", "readwrite");
                let entryStore = transaction.objectStore("entry");
                (Array.isArray(newEntry) ? newEntry : [newEntry]).forEach((newEntry) => entryStore.add(newEntry));
                transaction.addEventListener("complete", (event) => resolve(this.update()));
                transaction.addEventListener("error", (event) => reject(event.target.error));
            }
        );
    }

    deleteEntry(primaryKey)
    {
        return new Promise
        (
            (resolve, reject) =>
            {
                let transaction = this.#database.transaction("entry", "readwrite");
                let entryStore = transaction.objectStore("entry");
                (Array.isArray(primaryKey) ? primaryKey : [primaryKey]).forEach((primaryKey) => entryStore.delete(primaryKey));
                transaction.addEventListener("complete", (event) => resolve(this.update()));
                transaction.addEventListener("error", (event) => reject(event.target.error));    
            }
        );
    }

    putEntry(newEntry, primaryKey)
    {
        return new Promise
        (
            (resolve, reject) =>
            {
                let transaction = this.#database.transaction("entry", "readwrite");
                let entryStore = transaction.objectStore("entry");
                entryStore.put(newEntry, primaryKey);
                transaction.addEventListener("complete", (event) => resolve(this.update()));
                transaction.addEventListener("error", (event) => reject(event.target.error));
            }
        );
    }

    getEntries()
    {
        return new Promise
        (
            (resolve, reject) =>
            {
                let entries = [];
                let transaction = this.#database.transaction("entry", "readonly");
                let entryStore = transaction.objectStore("entry");
                let request = entryStore.getAll();
                request.addEventListener("success", (event) => entries = event.target.result);
                transaction.addEventListener("complete", (event) => resolve(entries));
                transaction.addEventListener("error", (event) => reject(event.target.error));
            }
        );
    }
}