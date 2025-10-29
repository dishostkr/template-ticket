import { SlashCommandBuilder } from '@discordjs/builders';
import { 
    ChatInputCommandInteraction, 
    ChannelType, 
    EmbedBuilder, 
    ActionRowBuilder, 
    StringSelectMenuBuilder,
    PermissionFlagsBits,
    TextChannel
} from 'discord.js';
import { ticketSystem } from '../utils/ticketSystem';

// 명령어 정의
export const data = new SlashCommandBuilder()
    .setName('ticket-setup')
    .setNameLocalization('ko', '티켓-설정')
    .setDescription('Setup the ticket system.')
    .setDescriptionLocalization('ko', '1:1 문의 티켓 시스템을 설정합니다.')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addChannelOption(option =>
        option
            .setName('panel-channel')
            .setNameLocalization('ko', '패널-채널')
            .setDescription('Channel to send the ticket panel.')
            .setDescriptionLocalization('ko', '문의하기 버튼/드롭다운을 보낼 채널')
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(true)
    )
    .addRoleOption(option =>
        option
            .setName('staff-role')
            .setNameLocalization('ko', '스태프-역할')
            .setDescription('Staff role to manage tickets.')
            .setDescriptionLocalization('ko', '생성된 모든 티켓을 열람하고 관리할 스태프 역할')
            .setRequired(true)
    )
    .addChannelOption(option =>
        option
            .setName('category-parent')
            .setNameLocalization('ko', '카테고리-부모')
            .setDescription('Category where ticket channels will be created.')
            .setDescriptionLocalization('ko', '생성된 티켓 채널들이 위치할 카테고리')
            .addChannelTypes(ChannelType.GuildCategory)
            .setRequired(true)
    )
    .addChannelOption(option =>
        option
            .setName('log-channel')
            .setNameLocalization('ko', '로그-채널')
            .setDescription('Channel to send ticket logs.')
            .setDescriptionLocalization('ko', '종료된 티켓의 대화 내용(로그)을 보낼 채널')
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(true)
    );

/**
 * ticket-setup 명령어 실행
 */
export async function execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.guild) {
        await interaction.reply({ 
            content: '이 명령어는 서버에서만 사용할 수 있습니다.', 
            ephemeral: true 
        });
        return;
    }

    const panelChannel = interaction.options.getChannel('panel-channel', true);
    const staffRole = interaction.options.getRole('staff-role', true);
    const categoryParent = interaction.options.getChannel('category-parent', true);
    const logChannel = interaction.options.getChannel('log-channel', true);

    // 설정 저장
    ticketSystem.setSetup(interaction.guild.id, {
        panelChannel: panelChannel.id,
        staffRole: staffRole.id,
        categoryParent: categoryParent.id,
        logChannel: logChannel.id
    });

    // 패널 채널에 메시지 전송
    if (panelChannel.type !== ChannelType.GuildText) {
        await interaction.reply({ 
            content: '패널 채널은 텍스트 채널이어야 합니다.', 
            ephemeral: true 
        });
        return;
    }

    // TextChannel로 fetch
    const textChannel = await interaction.guild.channels.fetch(panelChannel.id) as TextChannel;
    if (!textChannel) {
        await interaction.reply({ 
            content: '패널 채널을 찾을 수 없습니다.', 
            ephemeral: true 
        });
        return;
    }

    const embed = new EmbedBuilder()
        .setTitle('📩 1:1 문의')
        .setDescription('1:1 문의가 필요하신가요? 아래 드롭다운에서 문의 카테고리를 선택해주세요.')
        .setColor(0x5865F2)
        .setFooter({ text: '문의 카테고리를 선택하면 전용 채널이 생성됩니다.' });

    const selectMenu = new StringSelectMenuBuilder()
        .setCustomId('create-ticket-menu')
        .setPlaceholder('문의 카테고리를 선택해주세요')
        .addOptions([
            {
                label: '일반 문의',
                description: '일반적인 문의 사항',
                value: 'general',
                emoji: '💬'
            },
            {
                label: '서버 신고 / 제보',
                description: '서버 내 문제점 신고 및 제보',
                value: 'report',
                emoji: '🚨'
            },
            {
                label: '이벤트 / 파트너십',
                description: '이벤트 및 파트너십 관련 문의',
                value: 'event',
                emoji: '🎉'
            }
        ]);

    const row = new ActionRowBuilder<StringSelectMenuBuilder>()
        .addComponents(selectMenu);

    await textChannel.send({
        embeds: [embed],
        components: [row]
    });

    await interaction.reply({ 
        content: `✅ 티켓 시스템이 성공적으로 설정되었습니다!\n패널: <#${panelChannel.id}>\n스태프: <@&${staffRole.id}>\n카테고리: <#${categoryParent.id}>\n로그: <#${logChannel.id}>`, 
        ephemeral: true 
    });
}
