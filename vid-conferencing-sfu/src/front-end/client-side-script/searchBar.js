function debouncedPopulateDiv(){
    clearTimeout(timeOut);
    const timeOut= setTimeout(function(){
        populateDiv();
    },100); 
}

function populateDiv(){
    const a = document.getElementById("first").value;
    const b = document.getElementById("second").value;
    fetch("someBackendCode")
    .then(function(response){
        response.text()
        .then(function(ans){
            document.getElementById("finalThing").innerHTML = ans;
        })
    })
}