<?php
// المسارات المطلوبة بناءً على هيكلة سيرفر Hostinger الخاصة بك
$target = '/home/u689983086/domains/besouholacrm.net/api/storage/app/public';
$link = '/home/u689983086/domains/besouholacrm.net/api/public/storage';

// التأكد إذا كان هناك مجلد قديم معطل بنفس الاسم ونحذفه
if (file_exists($link)) {
    if (is_link($link)) {
        unlink($link);
    } else {
        // إذا كان مجلد حقيقي وليس اختصار، يجب حذفه يدوياً أولاً
        echo "Please delete the 'storage' folder inside 'public' manually first.";
        exit;
    }
}

if (symlink($target, $link)) {
    echo "<h1>Success!</h1> <p>Storage link created successfully.</p>";
} else {
    echo "<h1>Failed!</h1> <p>Error: " . error_get_last()['message'] . "</p>";
}
?>