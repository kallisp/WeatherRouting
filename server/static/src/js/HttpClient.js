class HTTPClient {
    
    constructor(){
        return {
            getData: this._getData,
            postData: this._postData,
            headers : {
                'Content-Type': 'application/json'
            }
        }
    }

    async _getData(url) {
        const response = await fetch(url, {
            method: 'GET',
            mode: 'cors',
            headers: this.headers,
        });
        const result = await response.json();
        return result;
    };

    async _postData(url, data) {
        const response = await fetch(url, {
            method: 'POST',
            mode: 'cors',
            headers: this.headers,
            body: JSON.stringify(data)
        });
        const result = await response.json();
        return result;
    };

}