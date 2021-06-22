var clearButton = $('#clear');

clearButton.on('click', function () {

    localStorage.clear();
    Swal.fire({
        title: '已成功重製紀錄!',
        customClass: {
            confirmButton: 'btn btn-success'
        },
        buttonsStyling: false

    })

});