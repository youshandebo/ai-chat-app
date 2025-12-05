// 此脚本用于修复 Admin.tsx，添加文章管理切换功能
const fs = require('fs');
const path = require('path');

const adminPath = path.join(__dirname, '../frontend/src/pages/Admin.tsx');
let content = fs.readFileSync(adminPath, 'utf-8');

// 1. 在 state 声明中添加 activeTab
const statePattern = /const \[loginError, setLoginError\] = useState\(''\);/;
const stateReplacement = `const [loginError, setLoginError] = useState('');
  const [activeTab, setActiveTab] = useState<'dashboard' | 'articles'>('dashboard');`;

if (content.match(statePattern) && !content.includes('activeTab')) {
    content = content.replace(statePattern, stateReplacement);
    console.log('✓ Added activeTab state');
}

// 2. 在导入中添加 FileText 图标
const iconPattern = /(import \{[^}]+Lock,\s*LogOut)/;
const iconReplacement = '$1,\n  FileText';

if (content.match(iconPattern) && !content.includes('FileText')) {
    content = content.replace(iconPattern, iconReplacement);
    console.log('✓ Added FileText icon');
}

// 3. 在退出按钮后添加切换按钮（查找 LogOut 按钮）
const logoutButtonPattern = /(<button\s+onClick=\{handleLogout\}[^>]*>[\s\S]*?<\/button>)/;
const match = content.match(logoutButtonPattern);

if (match && !content.includes('setActiveTab')) {
    const logoutButton = match[1];
    const newButtons = `${logoutButton}

            <button
              onClick={() => setActiveTab(activeTab === 'dashboard' ? 'articles' : 'dashboard')}
              className="px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-dark-bg rounded-lg transition-colors flex items-center gap-2 border border-gray-200 dark:border-dark-border"
              title={activeTab === 'dashboard' ? '文章管理' : '仪表盘'}
            >
              {activeTab === 'dashboard' ? (
                <>
                  <FileText className="w-4 h-4" />
                  文章管理
                </>
              ) : (
                <>
                  <Activity className="w-4 h-4" />
                  仪表盘
                </>
              )}
            </button>`;

    content = content.replace(logoutButtonPattern, newButtons);
    console.log('✓ Added tab switch button');
}

// 4. 替换内容显示逻辑（在 Stats Grid 之前添加条件）
const statsGridPattern = /{\/\* Stats Grid \*\/}/;
if (content.match(statsGridPattern) && !content.includes('activeTab === \'dashboard\'')) {
    content = content.replace(
        statsGridPattern,
        `{activeTab === 'dashboard' ? (\n        <>\n        {/* Stats Grid */}`
    );

    // 在最后的表格之后添加关闭标签
    const tableEndPattern = /(<\/div>\s*<\/div>\s*{\/\* Table \*\/}[\s\S]*?<\/div>)/;
    content = content.replace(tableEndPattern, '$1\n        </>\n      ) : (\n        <div className="text-center text-gray-500 dark:text-gray-400">\n          文章管理功能开发中...\n        </div>\n      )}');

    console.log('✓ Added conditional rendering');
}

// 保存文件
fs.writeFileSync(adminPath, content, 'utf-8');
console.log('\n✅ Admin.tsx 修改完成！');
console.log('刷新浏览器查看切换按钮。');
