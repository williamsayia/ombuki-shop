$(".send-button").click(function() {
    // Reset all error messages first
    $(".name-hide, .email-hide, .hide-message, .mobile-hide").text("");
    
    // Name validation
    var name = $(".name").val().trim();
    var nameCheck = /^[a-zA-Z\s]+$/;
    
    if (name === "") {
        $(".name-hide").text("Enter your name");
        return false;
    } else if (!nameCheck.test(name)) {
        $(".name-hide").text("Name can only contain letters and spaces");
        return false;
    } else if (name.length > 20) {
        $(".name-hide").text("Name cannot exceed 20 characters");
        return false;
    }

    // Email validation
    var email = $(".email").val().trim();
    var emailCheck = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;
    
    if (email === "") {
        $(".email-hide").text("Enter your email");
        return false;
    } else if (!emailCheck.test(email)) {
        $(".email-hide").text("Enter a valid email address");
        return false;
    }

    // Message validation
    var message = $(".message").val().trim();
    if (message === "") {
        $(".hide-message").text("Please write your message");
        return false;
    }

    // Mobile validation
    var mobile = $(".mobile").val().trim();
    var mobileCheck = /^[0-9]+$/;
    
    if (mobile === "") {
        $(".mobile-hide").text("Enter your mobile number");
        return false;
    } else if (!mobileCheck.test(mobile)) {
        $(".mobile-hide").text("Mobile number can only contain digits");
        return false;
    } else if (mobile.length < 10 || mobile.length > 15) {
        $(".mobile-hide").text("Enter a valid mobile number (10-15 digits)");
        return false;
    }
    

    // If all validations pass
    return true;
    
});