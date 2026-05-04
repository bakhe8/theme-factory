const fs = require('fs');
const path = require('path');

const themeName = process.argv[2];
const styleName = process.argv[3]; // luxury, bold, minimalist, fashion

const styles = {
    luxury: {
        primary: '#D4AF37',
        accent: '#1C1C1C',
        font: 'Amiri'
    },
    bold: {
        primary: '#FF3E3E',
        accent: '#000000',
        font: 'Cairo'
    },
    minimalist: {
        primary: '#1A1A1A',
        accent: '#7C83FD',
        font: 'Almarai'
    },
    fashion: {
        primary: '#111111',
        accent: '#E6BEAE',
        font: 'Outfit'
    }
};

if (!themeName || !styles[styleName]) {
    console.log('❌ الاستخدام: npm run factory:style <theme-name> <style>');
    process.exit(1);
}

const themePath = path.join(__dirname, '../themes', themeName, 'twilight.json');

if (!fs.existsSync(themePath)) {
    console.log('❌ الثيم غير موجود.');
    process.exit(1);
}

let config = JSON.parse(fs.readFileSync(themePath, 'utf8'));
const selectedStyle = styles[styleName];

function updateFields(fields) {
    fields.forEach(field => {
        if (field.id === 'primary_color') field.value = selectedStyle.primary;
        if (field.id === 'accent_color') field.value = selectedStyle.accent;
        if (field.id === 'font_family') field.value = selectedStyle.font;
    });
}

// دعم كلا الهيكلين (مصفوفة مباشرة أو كائن يحتوي على أقسام)
if (Array.isArray(config.settings)) {
    updateFields(config.settings);
} else if (config.settings && Array.isArray(config.settings.sections)) {
    config.settings.sections.forEach(section => updateFields(section.fields));
}

fs.writeFileSync(themePath, JSON.stringify(config, null, 4));

console.log(`🎨 تم تطبيق نمط [${styleName.toUpperCase()}] على الثيم [${themeName}] بنجاح!`);
