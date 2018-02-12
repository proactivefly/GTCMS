import router from './router'
import store from './store'
import { Message } from 'element-ui'
import NProgress from 'nprogress' // 网页加载进度条插件
import 'nprogress/nprogress.css'
import { getToken } from '@/utils/auth' // 从

NProgress.configure({ 
  showSpinner: false //禁用 进度环
})
// 权限判断
function hasPermission(roles, permissionRoles) {
  if (roles.indexOf('admin') >= 0) return true // admin permission passed directly
  if (!permissionRoles) return true
  return roles.some(role => permissionRoles.indexOf(role) >= 0)
}
//路由白名单
const whiteList = ['/login', '/authredirect'] // 无需登陆的页面

// 全局导航守卫,全局前置钩子
router.beforeEach((to, from, next) => { 
  NProgress.start() // start
  if (getToken()) { // 判断是否有token
    /* 如果有token*/
    if (to.path === '/login') { 
      next({ path: '/' }) //分解钩子
      NProgress.done() // end
    } else {
      if (store.getters.roles.length === 0) { // 如果还没拉取用户信息
        store.dispatch('GetUserInfo').then(res => { // 分发 GetUserInfo 拉取 user_info
          const roles = res.data.roles // 注意: roles 必须是个数组like: ['editor','develop']
          store.dispatch('GenerateRoutes', { roles }).then(() => { // 根据roles权限生成可访问的路由表
            router.addRoutes(store.getters.addRouters) // 动态添加可访问路由表
            next({ ...to, replace: true }) // hack方法 确保addRoutes已完成 ,set the replace: true so the navigation will not leave a history record
          })
        }).catch(() => {
          store.dispatch('FedLogOut').then(() => { //如果获取失败 ，从新登陆
            Message.error('验证身份失败, 请从新登陆')
            next({ path: '/login' }) //跳转登录页，分解钩子
          })
        })
      } else { 
        // 没有动态改变权限的需求可直接next() 删除下方权限判断 ↓
        if (hasPermission(store.getters.roles, to.meta.roles)) {
          next()//
        } else {
          next({ path: '/401', replace: true, query: { noGoBack: true }})
        }
        // 可删 ↑
      }
    }
  } else {
    /* 无token*/
    if (whiteList.indexOf(to.path) !== -1) { // 如果在在免登录白名单，直接进入
      next()
    } else {
      next('/login') // 否则全部重定向到登录页
      NProgress.done() // end
    }
  }
})

router.afterEach(() => { //全局后置钩子
  NProgress.done() // finish progress bar
})
