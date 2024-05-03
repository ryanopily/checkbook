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
                        <th>Description</th>
                        <th>Reconcile</th>
                        <th>Debit (+)</th>
                        <th>Credit (-)</th>
                        <th>Balance</th>
                        <th></th>
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
        this.element.querySelector("tbody").innerHTML = "";

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
                            let entry = cursor.value;
                            balance += entry.debit - entry.credit;
                            let tr = document.createElement("tr");
                            tr.primaryKey = cursor.primaryKey;
                            tr.entry = entry;
                            tr.balance = balance;
                            tr.innerHTML = 
                            `
                                <td>${entry.date}</td>
                                <td>${entry.description}</td>
                                <td>${entry.reconcile ? "R" : ""}</td>
                                <td>$${entry.debit.toFixed(2)}</td>
                                <td>$${entry.credit.toFixed(2)}</td>
                                <td>$${balance.toFixed(2)}</td>
                                <td><button>Edit</button></td>
                            `;
                            tr.children[6].children[0].addEventListener
                            (
                                "click",
                                (event) =>
                                {
                                    this.editEntry(tr);      
                                }
                            );
                            this.element.querySelector("tbody").appendChild(tr);
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
        let tr = document.createElement("tr");
        tr.innerHTML =
        `
            <td><input type="date"/></td>
            <td><input type="text"/></td>
            <td><input type="checkbox"/></td>
            <td><input type="number"/></td>
            <td><input type="number"/></td>
            <td><button>Add</button></td>
            <td></td>
        `;
        tr.children[5].children[0].addEventListener
        (
            "click",
            (event) =>
            {
                let entry = 
                {
                    date: tr.children[0].children[0].value,
                    description: tr.children[1].children[0].value,
                    reconcile: tr.children[2].children[0].checked,
                    debit: parseFloat(tr.children[3].children[0].value || 0),
                    credit: parseFloat(tr.children[4].children[0].value || 0),
                };
                this.recordEntry(entry);
            }
        );
        this.element.querySelector("tbody").appendChild(tr);
    }

    editEntry(tr)
    {
        if(tr !== undefined && tr.primaryKey !== undefined)
        {
            tr.children[0].innerHTML = `<input type="date" value="${tr.entry.date}"/>`;
            tr.children[1].innerHTML = `<input type="text" value="${tr.entry.description}"/>`;
            tr.children[2].innerHTML = `<input type="checkbox"/>`;
            tr.children[2].children[0].checked = tr.entry.reconcile;
            tr.children[3].innerHTML = `<input type="number" value="${tr.entry.debit}"/>`;
            tr.children[4].innerHTML = `<input type="number" value="${tr.entry.credit}"/>`;
            tr.children[5].innerHTML = `<button>Delete</button>`;
            tr.children[5].children[0].addEventListener
            (
                "click",
                (event) =>
                {
                    this.deleteEntry(tr.primaryKey);      
                }
            );
            tr.children[6].innerHTML = `<button>Save</button>`;
            tr.children[6].children[0].addEventListener
            (
                "click",
                (event) =>
                {
                    tr.entry.date = tr.children[0].children[0].value;
                    tr.entry.description = tr.children[1].children[0].value;
                    tr.entry.reconcile = tr.children[2].children[0].checked;
                    tr.entry.debit = parseFloat(tr.children[3].children[0].value || 0);
                    tr.entry.credit = parseFloat(tr.children[4].children[0].value || 0);
                    this.putEntry(tr.entry, tr.primaryKey);
                }
            );
            
        }
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
}