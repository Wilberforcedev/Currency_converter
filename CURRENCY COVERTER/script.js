$(document).ready(function(){
    $("#convertBtn").click(function(){
        var usdAmount = parseFloat($("#usdAmount").val());
        var exchangeRate = parseFloat ($("#exchangeRate").val());

        if (typeof usdAmount !=="number" || exchangeRate <= 0)
   {
        console.log("Please enter valid numbers!");
        return;
    }

    const exchangeRate =3700;
    let UGX =ugxAmount * exchangeRate;
    console.log('$(Amount'} usdAmount is equal to $${UGX} UGX');
    }
    var ugxAmount = usdAmount * exchangeRate;
    $("#convertedAmount").text(ugxAmount.toLocaleString() + "UGX");
    });
});