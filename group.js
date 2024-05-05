class GroupRegister
{
    element;
    #database;

    constructor(database)
    {
        this.element = document.createElement("group-register");
        this.element.innerHTML =
        `
            <table>
                <thead>
                    <tr>
                        <th>Code</th>
                        <th>Description</th>
                        <th>Add/Delete</th>
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
                            let tr = document.createElement("tr");
                            tr.primaryKey = cursor.primaryKey;
                            tr.group = cursor.value;
                            tr.innerHTML =
                            `
                                <td>${cursor.value.code}</td>
                                <td>${cursor.value.description}</td>
                                <td></td>
                                <td><button>Edit</button></td>
                            `;
                            tr.children[3].children[0].addEventListener("click", (event) => this.editGroup(tr));
                            tbody.appendChild(tr);
                            cursor.continue();
                        }
                    }
                );
                
                transaction.addEventListener("complete", (event) => resolve(this.newGroup()));
                transaction.addEventListener("error", (event) => reject(event.target.error));
            }
        );
    }

    newGroup()
    {
        let tr = document.createElement("tr");
        tr.innerHTML = 
        `
            <td><input type="text"/></td>
            <td><input type="text"/></td>
            <td><button>Add</button></td>
            <td></td>
        `;
        tr.children[2].children[0].addEventListener
        (
            "click",
            (event) =>
            {
                let newGroup =
                {
                    code: tr.children[0].children[0].value,
                    description: tr.children[1].children[0].value,
                };   
                this.createGroup(newGroup);
            }
        );
        this.element.querySelector("tbody").appendChild(tr);
    }

    editGroup(tr)
    {
        if(tr !== undefined && tr.primaryKey !== undefined)
        {
            tr.innerHTML =
            `
                <td><input type="text" value="${tr.group.code}"/></td>
                <td><input type="text" value="${tr.group.description}"/></td>
                <td><button>Delete</button></td>
                <td><button>Save</button></td>
            `;
            tr.children[2].children[0].addEventListener("click", (event) => this.deleteGroup(tr.primaryKey));
            tr.children[3].children[0].addEventListener
            (
                "click",
                (event) =>
                {
                    let newGroup =
                    {
                        code: tr.children[0].children[0].value,
                        description: tr.children[1].children[0].value
                    };
                    this.deleteGroup(tr.primaryKey).then(() => this.putGroup(newGroup));
                }
            )
        }
    }  

    createGroup(newGroup)
    {
        return new Promise
        (
            (resolve, reject) =>
            {
                let transaction = this.#database.transaction("group", "readwrite");
                let groupStore = transaction.objectStore("group");
                (Array.isArray(newGroup) ? newGroup : [newGroup]).forEach((newGroup) => groupStore.add(newGroup));
                transaction.addEventListener("complete", (event) => resolve(this.update()));
                transaction.addEventListener("error", (event) => reject(event.target.error));
            }
        );
    }

    deleteGroup(primaryKey)
    {
        return new Promise
        (
            (resolve, reject) =>
            {
                let transaction = this.#database.transaction("group", "readwrite");
                let groupStore = transaction.objectStore("group");
                (Array.isArray(primaryKey) ? primaryKey : [primaryKey]).forEach((primaryKey) => groupStore.delete(primaryKey));
                transaction.addEventListener("complete", (event) => resolve(this.update()));
                transaction.addEventListener("error", (event) => reject(event.target.error));    
            }
        );
    }

    putGroup(newGroup)
    {
        return new Promise
        (
            (resolve, reject) =>
            {
                let transaction = this.#database.transaction("group", "readwrite");
                let groupStore = transaction.objectStore("group");
                groupStore.put(newGroup);
                transaction.addEventListener("complete", (event) => resolve(this.update()));
                transaction.addEventListener("error", (event) => reject(event.target.error));
            }
        );
    }
}